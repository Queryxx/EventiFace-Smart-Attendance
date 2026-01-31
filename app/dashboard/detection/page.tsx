"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useSearchParams } from "next/navigation"
import * as faceapi from "face-api.js"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { getAsiaTimeFormatted, formatReadableDate, formatTo12Hour } from "@/lib/utils"

export default function Detect() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const eventId = searchParams?.get("eventId")
  const [modelsLoaded, setModelsLoaded] = useState(false)
  const [status, setStatus] = useState("Open camera to start detection")
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)
  const [currentStudent, setCurrentStudent] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [attendanceType, setAttendanceType] = useState("in")
  const [threshold, setThreshold] = useState(0.4)
  const [showDialog, setShowDialog] = useState(false)
  const [attendanceMessage, setAttendanceMessage] = useState<{ name: string; status: string; time: string } | null>(null)
  const [multipleDetections, setMultipleDetections] = useState<Array<{ name: string; status: string; time: string }>>([])
  const [eventData, setEventData] = useState<any>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const [boxes, setBoxes] = useState<any[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const [lastAttendanceCheck, setLastAttendanceCheck] = useState<Record<string, number>>({})
  const [attendedStudents, setAttendedStudents] = useState<Set<number>>(new Set())
  const [loadingAttendance, setLoadingAttendance] = useState(false)
  const pendingAttendanceRef = useRef<Set<number>>(new Set())
  const attendedStudentsRef = useRef<Set<number>>(new Set()) // Track attended students with ref for detection loop
  const detectionTimersRef = useRef<Record<string, number>>({}) // Track detection time for each student
  const detectionActiveRef = useRef<boolean>(false) // Track if detection loop is running
  const [currentSession, setCurrentSession] = useState<{ type: "AM" | "PM" | null; inWindow: boolean; message: string }>({
    type: null,
    inWindow: false,
    message: "No active session",
  })
  const [timeValidationError, setTimeValidationError] = useState<string | null>(null)

  useEffect(() => {
    checkAuthorization()
  }, [])

  async function checkAuthorization() {
    try {
      const response = await fetch("/api/auth/me")
      if (response.ok) {
        const data = await response.json()
        if (['superadmin', 'student_registrar'].includes(data.role)) {
          setIsAuthorized(true)
        } else {
          router.push("/dashboard")
          return
        }
      } else {
        router.push("/login")
        return
      }
    } catch (error) {
      console.error("Error checking authorization:", error)
      router.push("/login")
      return
    } finally {
      setAuthLoading(false)
    }
  }

  useEffect(() => {
    const loadModels = async () => {
      try {
        const MODEL_URL = "/models"
        console.log("Loading models from:", MODEL_URL)
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ])

        const modelLoaded =
          faceapi.nets.ssdMobilenetv1.isLoaded &&
          faceapi.nets.faceLandmark68Net.isLoaded &&
          faceapi.nets.faceRecognitionNet.isLoaded

        if (!modelLoaded) {
          throw new Error("Models did not load correctly")
        }
        console.log("✅ All models loaded successfully")
        setModelsLoaded(true)
      } catch (error) {
        console.error("Failed to load models:", error)
        setStatus("Error loading models. Please refresh and try again.")
      }
    }

    loadModels()

    // Cleanup function
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track: MediaStreamTrack) => track.stop())
      }
    }
  }, [])

  // Helper function to validate if current time is within session windows
  const validateSessionTime = (event: any): { isValid: boolean; session: string; message: string } => {
    if (!event.am_in_start_time && !event.pm_in_start_time) {
      // No sessions configured, allow attendance
      return { isValid: true, session: "No sessions", message: "No time restrictions" }
    }

    // Get current time in Asia/Manila timezone (HH:MM format)
    const currentTimeStr = getAsiaTimeFormatted('Asia/Manila').substring(0, 5)

    // Check AM session
    if (event.am_in_start_time && event.am_in_end_time && event.am_out_start_time && event.am_out_end_time) {
      const amInStart = event.am_in_start_time
      const amInEnd = event.am_in_end_time
      const amOutStart = event.am_out_start_time
      const amOutEnd = event.am_out_end_time

      const inAmCheckIn = currentTimeStr >= amInStart && currentTimeStr <= amInEnd
      const inAmCheckOut = currentTimeStr >= amOutStart && currentTimeStr <= amOutEnd

      if (inAmCheckIn) {
        return {
          isValid: true,
          session: "AM Check-In",
          message: `Valid: AM Check-In (${formatTo12Hour(amInStart)} - ${formatTo12Hour(amInEnd)})`,
        }
      }
      if (inAmCheckOut) {
        return {
          isValid: true,
          session: "AM Check-Out",
          message: `Valid: AM Check-Out (${formatTo12Hour(amOutStart)} - ${formatTo12Hour(amOutEnd)})`,
        }
      }
    }

    // Check PM session
    if (event.pm_in_start_time && event.pm_in_end_time && event.pm_out_start_time && event.pm_out_end_time) {
      const pmInStart = event.pm_in_start_time
      const pmInEnd = event.pm_in_end_time
      const pmOutStart = event.pm_out_start_time
      const pmOutEnd = event.pm_out_end_time

      const inPmCheckIn = currentTimeStr >= pmInStart && currentTimeStr <= pmInEnd
      const inPmCheckOut = currentTimeStr >= pmOutStart && currentTimeStr <= pmOutEnd

      if (inPmCheckIn) {
        return {
          isValid: true,
          session: "PM Check-In",
          message: `Valid: PM Check-In (${formatTo12Hour(pmInStart)} - ${formatTo12Hour(pmInEnd)})`,
        }
      }
      if (inPmCheckOut) {
        return {
          isValid: true,
          session: "PM Check-Out",
          message: `Valid: PM Check-Out (${formatTo12Hour(pmOutStart)} - ${formatTo12Hour(pmOutEnd)})`,
        }
      }
    }

    // Outside all time windows
    return {
      isValid: false,
      session: "Outside Session Times",
      message: `Current time ${currentTimeStr} is outside all valid session windows`,
    }
  }

  // Separate useEffect for loading event data
  useEffect(() => {
    const loadEventData = async () => {
      if (eventId) {
        try {
          console.log("Loading event data for eventId:", eventId)
          const res = await fetch(`/api/events/${eventId}`)
          console.log("Event fetch response status:", res.status)
          if (res.ok) {
            const data = await res.json()
            console.log("Event data loaded:", data)
            setEventData(data)
            setStatus(`Attendance for: ${data.event_name}`)

            // Validate session time
            const validation = validateSessionTime(data)
            setCurrentSession({
              type: validation.session.includes("AM")
                ? "AM"
                : validation.session.includes("PM")
                  ? "PM"
                  : null,
              inWindow: validation.isValid,
              message: validation.message,
            })
          } else {
            console.error("Event fetch failed with status:", res.status)
            const errorData = await res.json()
            console.error("Error response:", errorData)
          }
        } catch (error) {
          console.error("Error loading event data:", error)
        }
      } else {
        console.log("No eventId provided in URL")
      }
    }

    loadEventData()
  }, [eventId])

  const openCamera = async () => {
    try {
      console.log("Requesting camera access...")
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { min: 640, ideal: 1280, max: 1920 },
          height: { min: 480, ideal: 720, max: 1080 },
          facingMode: "user",
        },
      })

      streamRef.current = stream
      const video = videoRef.current
      if (!video) {
        throw new Error("Video element not found")
      }

      video.srcObject = stream
      video.setAttribute("playsinline", "true")

      // Wait for video to load metadata
      await new Promise<void>((resolve) => {
        if (video.onloadedmetadata === null) {
          video.onloadedmetadata = () => {
            resolve()
          }
        }
      })

      console.log("Camera stream acquired, playing video...")
      await video.play()
      console.log("Video playing, starting detection...")
      startDetection()
    } catch (error) {
      console.error("Camera access error:", error)
      setError("Failed to access camera. Please ensure camera permissions are granted.")
      setStatus("Camera error - check permissions")
    }
  }

  const startDetection = async () => {
    try {
      setStatus("Loading student data...")
      const res = await fetch("/api/students")
      if (!res.ok) {
        throw new Error(`Failed to fetch students: ${res.status} ${res.statusText}`)
      }
      const data = await res.json()
      let students = data

      // Filter by course if eventId provided
      if (eventId && eventData && eventData.course_id) {
        students = students.filter((s: any) => String(s.course_id) === String(eventData.course_id))
      }

      console.log(`Loaded ${students.length} students from server`)
      console.log("Students with face_encoding:", students.filter((s: any) => s.face_encoding).length)
      console.log("Sample student:", students[0])

      // Load existing attendance records for this event BEFORE starting detection
      if (eventId) {
        try {
          setLoadingAttendance(true)
          const attendanceRes = await fetch(`/api/attendance?eventId=${eventId}`)
          if (attendanceRes.ok) {
            const attendanceData = await attendanceRes.json()
            const recordedStudentIds = new Set<number>(
              attendanceData.map((record: any) => Number(record.student_id))
            )
            // Update both the ref and state
            attendedStudentsRef.current = recordedStudentIds
            setAttendedStudents(recordedStudentIds)
            console.log("Already recorded students:", recordedStudentIds)
          }
        } catch (error) {
          console.error("Error loading attendance records:", error)
        } finally {
          setLoadingAttendance(false)
        }
      }

      // Build labeled descriptors
      const labeled = students
        .filter((student: any) => student.face_encoding)
        .map((student: any) => {
          const descriptor = new Float32Array(JSON.parse(student.face_encoding))
          // Ensure label is string to match FaceMatcher expectations
          return new faceapi.LabeledFaceDescriptors(String(student.id), [descriptor])
        })

      // Create matcher only if we have registered students
      const matcher = labeled.length > 0 ? new faceapi.FaceMatcher(labeled, threshold) : null

      setStatus("Detecting...")

      const video = videoRef.current
      const overlay = overlayRef.current
      if (!video || !overlay) {
        throw new Error("Video or overlay element not found")
      }

      detectionActiveRef.current = true
      let frameCount = 0

      const detectFaces = async (): Promise<void> => {
        if (!detectionActiveRef.current) return
        try {
          frameCount++
          // Wait for video to be ready
          if (video.readyState < 2) {
            requestAnimationFrame(() => detectFaces())
            return
          }
          // Get video intrinsic dimensions
          const videoWidth = video.videoWidth
          const videoHeight = video.videoHeight
          if (videoWidth > 0 && videoHeight > 0) {
            // Get the displayed size of the video element (may be scaled by CSS)
            const rect = video.getBoundingClientRect()
            const displayWidth = rect.width
            const displayHeight = rect.height

            // Detect faces
            const detections = await faceapi
              .detectAllFaces(video, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.3 }))
              .withFaceLandmarks()
              .withFaceDescriptors()

            if (frameCount % 30 === 0) {
              console.log("Faces detected:", detections.length)
            }

            // Compute scaling factors from intrinsic video to displayed size
            const scaleX = displayWidth / videoWidth
            const scaleY = displayHeight / videoHeight

            // Map detections to overlay boxes and handle attendance
            const recordedThisFrame: Array<{ name: string; status: string; time: string }> = []
            const newBoxes = detections.map((d: any) => {
              const b = d.detection.box

              // If no registered students or matcher not created, mark all faces as unregistered
              if (!matcher) {
                return {
                  x: b.x * scaleX,
                  y: b.y * scaleY,
                  width: b.width * scaleX,
                  height: b.height * scaleY,
                  student: null,
                  distance: 1,
                  unregistered: true,
                }
              }

              const best = matcher.findBestMatch(d.descriptor)
              const student = students.find((s: any) => String(s.id) === best.label)

              // If distance is too high, treat as unregistered
              if (best.distance >= threshold) {
                return {
                  x: b.x * scaleX,
                  y: b.y * scaleY,
                  width: b.width * scaleX,
                  height: b.height * scaleY,
                  student: null,
                  distance: best.distance,
                  unregistered: true,
                }
              }

              // Process if we found a matching student
              if (student) {
                const now = Date.now()
                const lastCheck = lastAttendanceCheck[student.id] || 0
                const detectionKey = String(student.id)
                
                // Skip if already recorded in database for this event OR pending recording
                if (attendedStudentsRef.current.has(student.id) || pendingAttendanceRef.current.has(student.id)) {
                  // Clear detection timer if student was already attended
                  if (detectionTimersRef.current[detectionKey]) {
                    delete detectionTimersRef.current[detectionKey]
                  }
                  return {
                    x: b.x * scaleX,
                    y: b.y * scaleY,
                    width: b.width * scaleX,
                    height: b.height * scaleY,
                    student: student,
                    distance: best.distance,
                    alreadyAttended: true,
                  }
                }
                
                // Track continuous detection time for 3-second requirement
                if (!detectionTimersRef.current[detectionKey]) {
                  // First detection of this student
                  detectionTimersRef.current[detectionKey] = now
                } else {
                  const detectionDuration = now - detectionTimersRef.current[detectionKey]
                  
                  // Only process attendance after 3 seconds of continuous stable detection
                  if (detectionDuration >= 3000 && now - lastCheck >= 2000) {
                    setLastAttendanceCheck((prev) => ({
                      ...prev,
                      [student.id]: now,
                    }))

                    // Validate if current time is within session windows
                    const timeValidation = validateSessionTime(eventData || {})

                    if (!timeValidation.isValid) {
                      // Outside session time window - show error but don't record
                      setTimeValidationError(
                        `❌ ${student.first_name} detected outside valid session times. Current time is not within any check-in/check-out window.`
                      )
                      setTimeout(() => setTimeValidationError(null), 4000)
                      // Reset detection timer
                      delete detectionTimersRef.current[detectionKey]
                      return {
                        x: b.x * scaleX,
                        y: b.y * scaleY,
                        width: b.width * scaleX,
                        height: b.height * scaleY,
                        student: student,
                        distance: best.distance,
                        outsideTimeWindow: true,
                      }
                    }

                    // Mark as pending IMMEDIATELY to prevent duplicate recordings
                    pendingAttendanceRef.current.add(student.id)
                    // Reset detection timer after recording
                    delete detectionTimersRef.current[detectionKey]

                    // Extract session (AM/PM) from validation message
                    const session = timeValidation.session.includes("AM") ? "AM" : "PM"
                    const type = timeValidation.session.includes("Check-In") ? "IN" : "OUT"

                    // Record attendance
                    fetch("/api/attendance", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        student_id: student.id,
                        event_id: eventId ? parseInt(eventId) : null,
                        session: session,
                        type: type,
                        status: attendanceType,
                      }),
                    })
                      .then((res) => {
                        if (!res.ok) {
                          console.error("Failed to record attendance")
                          pendingAttendanceRef.current.delete(student.id)
                        } else {
                          // Add to attended set (both ref and state)
                          attendedStudentsRef.current.add(student.id)
                          setAttendedStudents((prev) => new Set([...prev, student.id]))
                          
                          // Show dialog immediately with student details
                          const time = new Date().toLocaleTimeString('en-US', { hour12: true })
                          const message = {
                            name: `${student.first_name} ${student.last_name}`,
                            status: attendanceType === "in" ? "Time In" : "Time Out",
                            time: time,
                          }
                          setAttendanceMessage(message)
                          setMultipleDetections([message])
                          setShowDialog(true)
                          setTimeout(() => setShowDialog(false), 3000)
                          
                          console.log(`✅ Attendance recorded for ${student.first_name} ${student.last_name}`)
                        }
                      })
                      .catch((err) => {
                        console.error("Attendance recording error:", err)
                        pendingAttendanceRef.current.delete(student.id)
                      })
                  }
                }

                return {
                  x: b.x * scaleX,
                  y: b.y * scaleY,
                  width: b.width * scaleX,
                  height: b.height * scaleY,
                  student: student,
                  distance: best.distance,
                }
              }

              // Also record attendance for unregistered faces
              if (best.distance >= threshold) {
                const now = Date.now()
                const faceKey = `unregistered_${best.label}`
                const lastCheck = lastAttendanceCheck[faceKey] || 0
                
                if (now - lastCheck >= 2000) {
                  setLastAttendanceCheck((prev) => ({
                    ...prev,
                    [faceKey]: now,
                  }))

                  // Show unregistered detection dialog
                  const time = new Date().toLocaleTimeString('en-US', { hour12: true })
                  setAttendanceMessage({
                    name: "Unknown Person",
                    status: "Not Registered",
                    time: time,
                  })
                  setShowDialog(true)
                  setTimeout(() => setShowDialog(false), 3000)
                }
              }

              return {
                x: b.x * scaleX,
                y: b.y * scaleY,
                width: b.width * scaleX,
                height: b.height * scaleY,
                student: null,
                distance: best.distance,
              }
            })

            setBoxes(newBoxes)
            // Update currentStudent if any known face
            const known = newBoxes.find((b) => b.student)
            setCurrentStudent(known ? known.student : null)
          }
          // Continue detection loop
          if (detectionActiveRef.current) {
            requestAnimationFrame(() => detectFaces())
          }
        } catch (error) {
          console.error("Detection frame error:", error)
          // Continue detection even if one frame fails
          if (detectionActiveRef.current) {
            requestAnimationFrame(() => detectFaces())
          }
        }
      }

      // Start detection loop
      detectFaces()
    } catch (error) {
      console.error("startDetection error:", error)
      setError("Failed to start detection. Please refresh and try again.")
      setStatus("Detection error - please refresh")
    }
  }

  const stopCamera = () => {
    // Stop detection loop immediately
    detectionActiveRef.current = false
    
    // Stop video stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track: MediaStreamTrack) => track.stop())
      streamRef.current = null
    }
    
    // Clear video element
    const video = videoRef.current
    if (video) {
      video.srcObject = null
    }
    
    setCurrentStudent(null)
    setBoxes([])
    attendedStudentsRef.current.clear()
    setAttendedStudents(new Set())
    pendingAttendanceRef.current.clear()
    detectionTimersRef.current = {} // Clear detection timers
    setStatus("Camera stopped - click Open Camera to start again")
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  if (!isAuthorized) {
    return null // This won't render as user will be redirected
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header with Back Button */}
      <div className="border-b border-slate-200 bg-white">
        <div className="px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {eventData ? eventData.event_name : "Face Detection & Attendance"}
            </h1>
            <p className="text-sm text-slate-500">Real-time face recognition attendance system</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Event Info Cards */}
          {eventData && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm">
                <p className="text-xs text-slate-500 font-semibold uppercase mb-1">Event Date</p>
                <p className="text-lg font-bold text-slate-900">{formatReadableDate(eventData.event_date)}</p>
              </div>
              <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm">
                <p className="text-xs text-slate-500 font-semibold uppercase mb-1">Time</p>
                <p className="text-lg font-bold text-slate-900">{formatTo12Hour(eventData.start_time)} - {formatTo12Hour(eventData.end_time)}</p>
              </div>
              <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm">
                <p className="text-xs text-slate-500 font-semibold uppercase mb-1">Course</p>
                <p className="text-lg font-bold text-slate-900">{eventData.course_id ? `Course ${eventData.course_id}` : "All Courses"}</p>
              </div>
              <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm">
                <p className="text-xs text-slate-500 font-semibold uppercase mb-1">Fine Amount</p>
                <p className="text-lg font-bold text-slate-900">₱{parseFloat(eventData.fine_amount).toFixed(2)}</p>
              </div>
            </div>
          )}

          {/* Main Content Grid */}
          <div className="grid grid-cols-4 gap-6">
            {/* Left Column: Camera (3 cols) */}
            <div className="col-span-3">
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-lg">
                {/* Session Status Display */}
                {eventData && (eventData.am_in_start_time || eventData.pm_in_start_time) && (
                  <div className={`mb-4 p-4 rounded-lg border-2 ${currentSession.inWindow ? "bg-green-50 border-green-300" : "bg-yellow-50 border-yellow-300"}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`font-semibold ${currentSession.inWindow ? "text-green-700" : "text-yellow-700"}`}>
                          {currentSession.inWindow ? "✓ Session Active" : "⚠ Outside Session Hours"}
                        </p>
                        <p className={`text-sm ${currentSession.inWindow ? "text-green-600" : "text-yellow-600"}`}>
                          {currentSession.message}
                        </p>
                      </div>
                      {currentSession.type && (
                        <div className="px-3 py-1 rounded-full bg-white font-semibold">
                          <span className={currentSession.type === "AM" ? "text-blue-600 text-lg" : "text-orange-600 text-lg"}>
                            {currentSession.type}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Time Validation Error */}
                {timeValidationError && (
                  <div className="mb-4 p-3 bg-red-50 border-2 border-red-300 rounded-lg">
                    <div className="flex items-center text-red-700 font-semibold text-sm">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {timeValidationError}
                    </div>
                  </div>
                )}

                {/* Controls */}
                <div className="flex flex-col gap-4 mb-4">
                  <div className="flex gap-3 items-center">
                    <button
                      disabled={!modelsLoaded}
                      className="flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 shadow-md"
                      onClick={openCamera}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Open Camera
                    </button>
                    <button
                      className="flex items-center justify-center gap-2 px-5 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors shadow-md"
                      onClick={stopCamera}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Stop
                    </button>
                    <div className="flex items-center gap-3 ml-auto">
                      <span className="text-sm font-medium text-slate-700">Threshold:</span>
                      <input
                        type="range"
                        min="0.3"
                        max="0.8"
                        step="0.05"
                        value={threshold}
                        onChange={(e) => setThreshold(parseFloat(e.target.value))}
                        className="w-24 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                      />
                      <span className="text-sm font-bold text-blue-600 w-10">{threshold.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="inline-flex items-center px-4 py-2 rounded-lg bg-blue-50 text-blue-700 text-sm w-fit font-medium">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    {status}
                  </div>
                </div>

                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center text-red-700 text-sm font-medium">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {error}
                    </div>
                  </div>
                )}

                {/* Camera */}
                <div className="relative rounded-xl overflow-hidden shadow-xl bg-black flex justify-center border border-slate-300">
                  <video
                    ref={videoRef}
                    className="max-w-full h-auto"
                    style={{ display: "block", objectFit: "contain", maxHeight: "70vh", zIndex: 10, transform: "scaleX(-1)" }}
                    muted
                    playsInline
                  />
                  <div
                    ref={overlayRef}
                    className="absolute top-0 left-0 w-full h-full pointer-events-none"
                    style={{ maxHeight: "70vh", zIndex: 9999 }}
                  >
                    {boxes.map((b, i) => {
                      const labelText = b.student
                        ? b.alreadyAttended
                          ? `✓ ${b.student.first_name} - Recorded`
                          : b.outsideTimeWindow
                            ? `⏰ ${b.student.first_name} - Outside Hours`
                            : `${b.student.first_name} (${(b.distance * 100).toFixed(0)}%)`
                        : b.unregistered
                          ? `Not Registered (${(b.distance * 100).toFixed(0)}%)`
                          : ""
                      const overlayWidth = overlayRef.current ? overlayRef.current.clientWidth : 0
                      const overlayHeight = overlayRef.current ? overlayRef.current.clientHeight : 0

                      const flippedX = overlayWidth - b.x - b.width

                      const estLabelPadding = 16
                      const estLabelHeight = 28
                      const estCharWidth = 8
                      const estLabelWidth = labelText ? Math.min(overlayWidth, labelText.length * estCharWidth + estLabelPadding) : 0

                      let labelLeft = flippedX + (b.width - estLabelWidth) / 2
                      labelLeft = Math.max(4, Math.min(labelLeft, Math.max(4, overlayWidth - estLabelWidth - 4)))

                      let labelTop = b.y - estLabelHeight - 6
                      if (labelTop < 0) {
                        labelTop = b.y + b.height + 6
                      }
                      if (labelTop + estLabelHeight > overlayHeight) {
                        labelTop = Math.max(4, overlayHeight - estLabelHeight - 4)
                      }

                      return (
                        <div
                          key={i}
                          className="absolute"
                          style={{
                            left: `${flippedX}px`,
                            top: `${b.y}px`,
                            width: `${b.width}px`,
                            height: `${b.height}px`,
                            pointerEvents: "none",
                          }}
                        >
                          <div
                            className="absolute border-2 rounded-lg"
                            style={{
                              left: 0,
                              top: 0,
                              width: "100%",
                              height: "100%",
                              boxSizing: "border-box",
                              borderColor: b.alreadyAttended
                                ? "#3b82f6"
                                : b.outsideTimeWindow
                                  ? "#ef4444"
                                  : b.student
                                    ? "#22c55e"
                                    : b.unregistered
                                      ? "#f59e0b"
                                      : "#ef4444",
                              zIndex: 9999,
                              pointerEvents: "none",
                            }}
                          />

                          {labelText && (
                            <div
                              aria-hidden
                              style={{
                                position: "absolute",
                                left: `${labelLeft - b.x}px`,
                                top: `${labelTop - b.y}px`,
                                background: b.alreadyAttended
                                  ? "rgba(59,130,246,0.92)"
                                  : b.outsideTimeWindow
                                    ? "rgba(239,68,68,0.92)"
                                    : b.unregistered
                                      ? "rgba(245,158,11,0.92)"
                                      : "rgba(34,197,94,0.92)",
                                color: "#fff",
                                padding: "5px 10px",
                                fontWeight: 700,
                                borderRadius: 6,
                                whiteSpace: "nowrap",
                                transform: "translateZ(0)",
                                boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
                                fontSize: "14px",
                              }}
                            >
                              {labelText}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Info & Legends (1 col) */}
            <div className="col-span-1 space-y-4">
              {/* Legend */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-lg">
                <h3 className="text-sm font-bold text-slate-900 uppercase mb-3 border-b border-slate-200 pb-2">Legend</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="w-4 h-4 rounded border-2 border-green-500 flex-shrink-0"></div>
                    <div className="text-sm">
                      <p className="font-semibold text-green-700">Green</p>
                      <p className="text-xs text-green-600">New Attendance</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="w-4 h-4 rounded border-2 border-blue-500 flex-shrink-0"></div>
                    <div className="text-sm">
                      <p className="font-semibold text-blue-700">Blue</p>
                      <p className="text-xs text-blue-600">Already Recorded</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div className="w-4 h-4 rounded border-2 border-yellow-500 flex-shrink-0"></div>
                    <div className="text-sm">
                      <p className="font-semibold text-yellow-700">Yellow</p>
                      <p className="text-xs text-yellow-600">Not Registered</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
                    <div className="w-4 h-4 rounded border-2 border-red-500 flex-shrink-0"></div>
                    <div className="text-sm">
                      <p className="font-semibold text-red-700">Red</p>
                      <p className="text-xs text-red-600">Outside Hours</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Student Detected Info */}
              {currentStudent && (
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-lg border-l-4 border-l-green-500">
                  <div className="flex items-center mb-4">
                    <svg className="w-7 h-7 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <h3 className="text-sm font-bold text-slate-900">Detected</h3>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="text-xs text-slate-500 font-semibold">Student ID</p>
                      <p className="font-semibold text-slate-900">{currentStudent.student_number}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-semibold">Name</p>
                      <p className="font-semibold text-slate-900">
                        {currentStudent.first_name} {currentStudent.last_name}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-semibold">Year Level</p>
                      <p className="font-semibold text-slate-900">{currentStudent.year_level || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-semibold">Section</p>
                      <p className="font-semibold text-slate-900">{currentStudent.section_id || "N/A"}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Attendance Success Dialog */}
              <Dialog open={showDialog} onOpenChange={setShowDialog}>
                <DialogContent className={multipleDetections.length > 1 ? "sm:max-w-2xl" : "sm:max-w-md"}>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {multipleDetections.length > 1
                        ? `${multipleDetections.length} Students Detected`
                        : "Attendance Recorded"}
                    </DialogTitle>
                  </DialogHeader>
                  {multipleDetections.length > 1 ? (
                    <div className="space-y-4">
                      <p className="text-sm text-gray-600 font-medium">
                        The following students have been recorded:
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                        {multipleDetections.map((detection, idx) => (
                          <div key={idx} className="bg-green-50 rounded-lg p-4 border border-green-200">
                            <div className="mb-2">
                              <p className="text-xs text-gray-600">Name</p>
                              <p className="font-semibold text-gray-900">{detection.name}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <p className="text-xs text-gray-600">Status</p>
                                <p className="text-sm font-medium text-blue-600">{detection.status}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-600">Time</p>
                                <p className="text-sm font-medium text-purple-600">{detection.time}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : attendanceMessage ? (
                    <div className="space-y-4">
                      <div className="bg-green-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600">Student Name</p>
                        <p className="text-lg font-bold text-gray-900">{attendanceMessage.name}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-blue-50 rounded-lg p-4">
                          <p className="text-sm text-gray-600">Status</p>
                          <p className="text-lg font-bold text-blue-600">{attendanceMessage.status}</p>
                        </div>
                        <div className="bg-purple-50 rounded-lg p-4">
                          <p className="text-sm text-gray-600">Time</p>
                          <p className="text-lg font-bold text-purple-600">{attendanceMessage.time}</p>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </DialogContent>
              </Dialog>
            </div>
         
  )
}
