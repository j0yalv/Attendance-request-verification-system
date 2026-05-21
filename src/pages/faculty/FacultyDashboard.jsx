import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../supabaseClient'
import { useNavigate } from 'react-router-dom'
import {
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Clock3,
  FileSearch,
  Home,
  LogOut,
  XCircle,
} from 'lucide-react'

function FacultyDashboard() {
  const [faculty, setFaculty] = useState(null)
  const [students, setStudents] = useState([])
  const [requests, setRequests] = useState([])
  const [activeDecision, setActiveDecision] = useState(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const navigate = useNavigate()

  const studentsById = useMemo(() => {
    return students.reduce((lookup, student) => {
      lookup[student.id] = student
      return lookup
    }, {})
  }, [students])

  const fetchRequests = async (facultyId) => {
    const { data, error: requestsError } = await supabase
      .from('requests')
      .select('*')
      .eq('faculty_id', facultyId)
      .order('created_at', { ascending: false })

    if (requestsError) throw requestsError
    setRequests(data || [])
    return data || []
  }

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true)
      setError('')

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()

        if (userError) throw userError
        if (!user) throw new Error('Please log in again to view your dashboard.')

        const { data: profile, error: profileError } = await supabase
          .from('faculty')
          .select('*')
          .eq('id', user.id)
          .single()

        if (profileError) throw profileError
        setFaculty(profile)

        const requestRows = await fetchRequests(profile.id)
        const studentIds = [...new Set(requestRows.map((request) => request.student_id).filter(Boolean))]

        if (studentIds.length > 0) {
          const { data: studentRows, error: studentsError } = await supabase
            .from('students')
            .select('id, name, email, dept, semester, usn')
            .in('id', studentIds)

          if (studentsError) throw studentsError
          setStudents(studentRows || [])
        }
      } catch (dashboardError) {
        setError(dashboardError.message || 'Unable to load faculty dashboard. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  const statusClassName = (status) => {
    const styles = {
      Pending: 'status-pending',
      Approved: 'status-approved',
      Rejected: 'status-rejected',
    }

    return styles[status] || 'status-neutral'
  }

  const formatDateRange = (startDate, endDate) => {
    const options = { day: 'numeric', month: 'short', year: 'numeric' }
    const start = new Date(startDate).toLocaleDateString(undefined, options)
    const end = new Date(endDate).toLocaleDateString(undefined, options)
    return startDate === endDate ? start : `${start} - ${end}`
  }

  const openDecision = (requestId, status) => {
    setError('')
    setSuccess('')
    setActiveDecision({ requestId, status, remark: '' })
  }

  const handleRemarkChange = (event) => {
    setActiveDecision((current) => ({ ...current, remark: event.target.value }))
  }

  const confirmDecision = async () => {
    if (!activeDecision) return

    const trimmedRemark = activeDecision.remark.trim()

    if (activeDecision.status === 'Rejected' && !trimmedRemark) {
      setError('Please add a remark before rejecting a request.')
      return
    }

    setUpdating(true)
    setError('')
    setSuccess('')

    try {
      const { data, error: updateError } = await supabase
        .from('requests')
        .update({
          status: activeDecision.status,
          faculty_remark: trimmedRemark || null,
        })
        .eq('request_id', activeDecision.requestId)
        .eq('faculty_id', faculty.id)
        .eq('status', 'Pending')
        .select('request_id')

      if (updateError) throw updateError

      if (!data || data.length === 0) {
        throw new Error('This request has already been updated or is no longer pending.')
      }

      setActiveDecision(null)
      setSuccess(`Request ${activeDecision.status.toLowerCase()} successfully.`)
      await fetchRequests(faculty.id)
    } catch (decisionError) {
      setError(decisionError.message || 'Unable to update this request. Please try again.')
    } finally {
      setUpdating(false)
    }
  }

  const pendingCount = requests.filter((request) => request.status === 'Pending').length
  const approvedCount = requests.filter((request) => request.status === 'Approved').length
  const rejectedCount = requests.filter((request) => request.status === 'Rejected').length

  if (loading) {
    return (
      <div className="app-shell flex items-center justify-center">
        <div className="loading-card">
          Loading faculty dashboard...
        </div>
      </div>
    )
  }

  return (
    <div className="portal-shell">
      <aside className="portal-sidebar">
        <div className="flex items-center gap-3">
          <span className="brand-mark">AF</span>
          <div>
            <p className="font-bold text-slate-950">AttendFlow</p>
            <p className="text-xs text-slate-500">Faculty portal</p>
          </div>
        </div>

        <nav className="mt-6 flex gap-2 overflow-x-auto lg:block lg:space-y-1 lg:overflow-visible">
          <a href="#dashboard" className="sidebar-link sidebar-link-active">
            <Home className="h-4 w-4" />
            Dashboard
          </a>
          <a href="#pending-requests" className="sidebar-link">
            <Clock3 className="h-4 w-4" />
            Pending Requests
          </a>
          <a href="#all-requests" className="sidebar-link">
            <ClipboardList className="h-4 w-4" />
            All Requests
          </a>
        </nav>

        <button
          onClick={async () => {
            await supabase.auth.signOut()
            navigate('/login')
          }}
          className="btn-secondary mt-5 w-full lg:mt-8"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </aside>

      <main className="portal-main">
        <div className="portal-content">
          <header id="dashboard" className="portal-topbar">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="eyebrow">Faculty Dashboard</p>
                <h1 className="page-title">
                  Welcome{faculty?.name ? `, ${faculty.name}` : ''}
                </h1>
                <p className="muted-copy">{faculty?.dept} department requests</p>
              </div>
              <button
                onClick={async () => {
                  await supabase.auth.signOut()
                  navigate('/login')
                }}
                className="btn-secondary"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          </header>

          <section className="summary-grid">
            <article className="summary-card">
              <div className="summary-icon">
                <ClipboardList className="h-5 w-5" />
              </div>
              <p className="mt-4 text-sm font-medium text-slate-500">Total assigned</p>
              <p className="mt-1 text-3xl font-bold text-slate-950">{requests.length}</p>
            </article>
            <article className="summary-card">
              <div className="summary-icon">
                <Clock3 className="h-5 w-5" />
              </div>
              <p className="mt-4 text-sm font-medium text-slate-500">Pending review</p>
              <p className="mt-1 text-3xl font-bold text-slate-950">{pendingCount}</p>
            </article>
            <article className="summary-card">
              <div className="summary-icon">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <p className="mt-4 text-sm font-medium text-slate-500">Approved</p>
              <p className="mt-1 text-3xl font-bold text-slate-950">{approvedCount}</p>
            </article>
            <article className="summary-card">
              <div className="summary-icon">
                <XCircle className="h-5 w-5" />
              </div>
              <p className="mt-4 text-sm font-medium text-slate-500">Rejected</p>
              <p className="mt-1 text-3xl font-bold text-slate-950">{rejectedCount}</p>
            </article>
          </section>

          {(error || success) && (
            <div
              className={`alert ${
                error
                  ? 'alert-error'
                  : 'alert-success'
              }`}
            >
              {error || success}
            </div>
          )}

          <section id="pending-requests" className="surface-card">
            <div className="section-heading">
              <div className="flex items-center gap-3">
                <span className="summary-icon">
                  <FileSearch className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="section-title">Attendance requests</h2>
                  <p className="section-subtitle">Review pending requests and record faculty remarks.</p>
                </div>
              </div>
            </div>

            {requests.length === 0 ? (
              <div className="empty-state">
                <h3 className="text-base font-semibold text-slate-950">No requests assigned</h3>
                <p className="mt-1 text-sm text-slate-500">Student requests sent to you will appear here.</p>
              </div>
            ) : (
              <div id="all-requests" className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Subject</th>
                      <th>Category</th>
                      <th>Dates</th>
                      <th>Status</th>
                      <th>Description</th>
                      <th>Proof</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.map((request) => {
                      const student = studentsById[request.student_id]
                      const isPending = request.status === 'Pending'
                      const isActive = activeDecision?.requestId === request.request_id

                      return (
                        <tr key={request.request_id}>
                          <td>
                            <div className="font-semibold text-slate-950">{student?.name || 'Student unavailable'}</div>
                            <div className="mt-0.5 text-xs text-slate-500">{student?.usn || request.student_id}</div>
                          </td>
                          <td className="font-semibold text-slate-950">{request.subject_code}</td>
                          <td className="text-slate-600">{request.category}</td>
                          <td className="text-slate-600">
                            {formatDateRange(request.start_date, request.end_date)}
                          </td>
                          <td>
                            <span
                              className={`status-pill ${statusClassName(
                                request.status,
                              )}`}
                            >
                              {request.status}
                            </span>
                            {request.faculty_remark && (
                              <p className="mt-2 max-w-xs text-xs text-slate-500">{request.faculty_remark}</p>
                            )}
                          </td>
                          <td className="max-w-xs text-slate-600">{request.description}</td>
                          <td>
                            {request.proof_url ? (
                              <a
                                href={request.proof_url}
                                target="_blank"
                                rel="noreferrer"
                                className="font-semibold text-blue-700 transition hover:text-blue-800 hover:underline"
                              >
                                View proof
                              </a>
                            ) : (
                              <span className="text-slate-400">No proof</span>
                            )}
                          </td>
                          <td>
                            {isPending ? (
                              <div className="min-w-64 space-y-3">
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => openDecision(request.request_id, 'Approved')}
                                    className="btn-success"
                                  >
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    Approve
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => openDecision(request.request_id, 'Rejected')}
                                    className="btn-danger"
                                  >
                                    <XCircle className="h-3.5 w-3.5" />
                                    Reject
                                  </button>
                                </div>

                                {isActive && (
                                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 shadow-inner">
                                    <label className="block">
                                      <span className="text-xs font-semibold text-slate-700">
                                        Remark {activeDecision.status === 'Rejected' ? '(required)' : '(optional)'}
                                      </span>
                                      <input
                                        type="text"
                                        value={activeDecision.remark}
                                        onChange={handleRemarkChange}
                                        placeholder="Add a remark"
                                        className="field-input mt-1 text-xs"
                                      />
                                    </label>
                                    <div className="mt-3 flex gap-2">
                                      <button
                                        type="button"
                                        onClick={confirmDecision}
                                        disabled={updating}
                                        className="btn-primary min-h-0 px-3 py-1.5 text-xs"
                                      >
                                        <ClipboardCheck className="h-3.5 w-3.5" />
                                        {updating ? 'Saving...' : 'Confirm'}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setActiveDecision(null)}
                                        disabled={updating}
                                        className="btn-secondary min-h-0 px-3 py-1.5 text-xs"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs font-medium text-slate-400">Completed</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}

export default FacultyDashboard
