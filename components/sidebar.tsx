"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { LogOut, LayoutGrid, Users, Calendar, BookOpen, Layers, CheckCircle, CreditCard, Settings, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"

export function Sidebar() {
  const pathname = usePathname()
  const [adminName, setAdminName] = useState<string | null>(null)
  const [adminRole, setAdminRole] = useState<string | null>(null)

  useEffect(() => {
    async function fetchCurrentAdmin() {
      try {
        const response = await fetch("/api/auth/me")
        if (response.ok) {
          const data = await response.json()
          setAdminName(data.full_name || data.username)
          setAdminRole(data.role)
        } else {
          console.error("Failed to fetch admin:", response.status)
          setAdminName("Admin")
          setAdminRole(null)
        }
      } catch (error) {
        console.error("Error fetching admin info:", error)
        setAdminName("Admin")
        setAdminRole(null)
      }
    }

    fetchCurrentAdmin()
  }, [])

  // Define all possible navigation items
  const allNavigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutGrid },
    { name: "Students", href: "/dashboard/students", icon: Users },
    { name: "Events", href: "/dashboard/events", icon: Calendar },
    { name: "Courses", href: "/dashboard/courses", icon: BookOpen },
    { name: "Sections", href: "/dashboard/sections", icon: Layers },
    { name: "Attendance", href: "/dashboard/attendance", icon: CheckCircle },
    { name: "Fines", href: "/dashboard/fines", icon: CreditCard },
    { name: "Admin Users", href: "/dashboard/admins", icon: Settings },
  ]

  // Filter navigation based on role
  const getFilteredNavigation = () => {
    if (!adminRole) return []

    switch (adminRole) {
      case 'superadmin':
        return allNavigation
      case 'student_registrar':
        return allNavigation.filter(item =>
          ['Dashboard', 'Students', 'Events', 'Courses', 'Sections'].includes(item.name)
        )
      case 'fine_manager':
      case 'receipt_manager':
        return allNavigation.filter(item =>
          ['Dashboard', 'Attendance', 'Fines'].includes(item.name)
        )
      default:
        return [allNavigation[0]] // Just Dashboard for unknown roles
    }
  }

  const navigation = getFilteredNavigation()

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" })
    window.location.href = "/login"
  }

  return (
    <div className="w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border h-screen fixed left-0 top-0 flex flex-col">
      <div className="p-6 border-b border-sidebar-border flex items-center gap-3">
        <img 
          src="/logo.png" 
          alt="UA Logo" 
          className="w-12 h-12 rounded-full object-cover flex-shrink-0"
        />
        <div>
          <h1 className="text-lg font-bold text-sidebar-primary">UA EventiFace</h1>
          <p className="text-xs text-sidebar-foreground/60">{adminName || "Loading..."}</p>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {navigation.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link key={item.href} href={item.href}>
              <Button variant={isActive ? "default" : "ghost"} className="w-full justify-start" asChild>
                <span>
                  <Icon className="mr-2 h-4 w-4" />
                  {item.name}
                </span>
              </Button>
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        <Button variant="outline" className="w-full justify-start bg-transparent" onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>
    </div>
  )
}
