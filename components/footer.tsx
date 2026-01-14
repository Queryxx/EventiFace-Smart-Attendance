import Link from "next/link"
import { Facebook, Mail, Code } from "lucide-react"

export function Footer() {
  return (
    <footer className="w-full py-6 border-t border-slate-200">
      <div className="flex justify-center gap-6 mb-4 items-center">
        <a href="https://www.facebook.com/asistictso" target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:text-slate-900 transition-colors flex items-center gap-1">
          <Facebook size={18} />
          Facebook
        </a>
        <a href="mailto:bsit@asist.edu.ph.com" className="text-slate-600 hover:text-slate-900 transition-colors flex items-center gap-1">
          <Mail size={18} />
          Email
        </a>
        </div>
      <div className="flex flex-col items-center gap-2 text-sm text-slate-600">
        <p>&copy; 2026 UA EventiFace Smart Attendance. All rights reserved.</p>
        <a href="#" className="text-slate-600 hover:text-slate-900 transition-colors flex items-center gap-1">
          <Code size={18} />
          Developed by: BSIT 3
        </a>
      </div>
    </footer>
  )
}
