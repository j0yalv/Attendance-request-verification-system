import { Link } from 'react-router-dom'
import { CheckCircle2, ClipboardCheck, FileUp, GraduationCap, ShieldCheck } from 'lucide-react'

const features = [
  {
    title: 'Attendance Request Submission',
    description: 'Students can submit consideration requests with subject, date, category, and supporting proof details.',
    icon: ClipboardCheck,
  },
  {
    title: 'Faculty Approval Workflow',
    description: 'Faculty reviewers can verify assigned requests and record clear approval or rejection decisions.',
    icon: CheckCircle2,
  },
  {
    title: 'Proof Upload & Verification',
    description: 'Documents and images stay attached to the request flow for simple academic review.',
    icon: FileUp,
  },
]

function Landing() {
  return (
    <div className="landing-shell">
      <nav className="landing-nav">
        <Link to="/" className="flex items-center gap-3">
          <span className="brand-mark">AF</span>
          <div>
            <p className="text-sm font-bold text-slate-950">AttendFlow</p>
            <p className="text-xs text-slate-500">Academic request portal</p>
          </div>
        </Link>
        <Link to="/login" className="btn-secondary hidden sm:inline-flex">
          Portal Login
        </Link>
      </nav>

      <main className="landing-hero">
        <section>
          <span className="landing-kicker">
            <GraduationCap className="h-4 w-4" />
            University workflow platform
          </span>
          <h1 className="landing-title">
            Attendance requests, reviewed with clarity.
          </h1>
          <p className="landing-copy">
            AttendFlow helps students submit attendance consideration requests and gives faculty a clean,
            focused workspace for review, proof verification, and status updates.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link to="/login" className="btn-primary">
              <GraduationCap className="h-4 w-4" />
              Student Login
            </Link>
            <Link to="/login" className="btn-secondary">
              <ShieldCheck className="h-4 w-4" />
              Faculty Login
            </Link>
          </div>
        </section>

        <section className="rounded-2xl border border-white/80 bg-white/85 p-5 shadow-[0_30px_90px_-55px_rgba(15,23,42,0.65)] backdrop-blur">
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/85 p-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <p className="text-sm font-semibold text-slate-950">Request Review Queue</p>
                <p className="mt-1 text-xs text-slate-500">Academic workflow snapshot</p>
              </div>
              <span className="status-pill status-pending">Pending</span>
            </div>
            <div className="mt-4 space-y-3">
              {['Medical certificate review', 'Workshop attendance proof', 'Sports event consideration'].map((item, index) => (
                <div key={item} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-sm font-bold text-indigo-700">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-800">{item}</p>
                    <p className="text-xs text-slate-500">Subject, dates, category, and proof attached</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <section className="mx-auto grid max-w-7xl gap-4 pb-12 md:grid-cols-3">
        {features.map(({ title, description, icon: Icon }) => (
          <article key={title} className="feature-card">
            <div className="summary-icon">
              <Icon className="h-5 w-5" />
            </div>
            <h2 className="mt-4 text-base font-semibold text-slate-950">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
          </article>
        ))}
      </section>
    </div>
  )
}

export default Landing
