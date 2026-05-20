import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../supabaseClient'
import { useNavigate } from 'react-router-dom'

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
      Pending: 'bg-yellow-100 text-yellow-800 ring-yellow-200',
      Approved: 'bg-green-100 text-green-800 ring-green-200',
      Rejected: 'bg-red-100 text-red-800 ring-red-200',
    }

    return styles[status] || 'bg-gray-100 text-gray-700 ring-gray-200'
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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="rounded-lg bg-white px-6 py-4 text-sm font-medium text-slate-600 shadow-sm ring-1 ring-slate-200">
          Loading faculty dashboard...
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-blue-600">Faculty Dashboard</p>
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              Welcome{faculty?.name ? `, ${faculty.name}` : ''}
            </h1>
            <p className="mt-1 text-sm text-slate-500">{faculty?.dept} department requests</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
              {requests.filter((request) => request.status === 'Pending').length} pending request
              {requests.filter((request) => request.status === 'Pending').length === 1 ? '' : 's'}
            </div>
            <button
              onClick={async () => {
                await supabase.auth.signOut()
                navigate('/login')
              }}
              className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 hover:bg-slate-50"
            >
              Sign out
            </button>
          </div>
        </header>

        {(error || success) && (
          <div
            className={`rounded-lg border px-4 py-3 text-sm ${
              error
                ? 'border-red-200 bg-red-50 text-red-700'
                : 'border-green-200 bg-green-50 text-green-700'
            }`}
          >
            {error || success}
          </div>
        )}

        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-lg font-semibold text-slate-900">Attendance requests</h2>
          </div>

          {requests.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <h3 className="text-base font-semibold text-slate-900">No requests assigned</h3>
              <p className="mt-1 text-sm text-slate-500">Student requests sent to you will appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Student</th>
                    <th className="px-5 py-3">Subject</th>
                    <th className="px-5 py-3">Category</th>
                    <th className="px-5 py-3">Dates</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Description</th>
                    <th className="px-5 py-3">Proof</th>
                    <th className="px-5 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {requests.map((request) => {
                    const student = studentsById[request.student_id]
                    const isPending = request.status === 'Pending'
                    const isActive = activeDecision?.requestId === request.request_id

                    return (
                      <tr key={request.request_id} className="align-top">
                        <td className="px-5 py-4">
                          <div className="font-medium text-slate-900">{student?.name || 'Student unavailable'}</div>
                          <div className="mt-0.5 text-xs text-slate-500">{student?.usn || request.student_id}</div>
                        </td>
                        <td className="px-5 py-4 font-medium text-slate-900">{request.subject_code}</td>
                        <td className="px-5 py-4 text-slate-600">{request.category}</td>
                        <td className="px-5 py-4 text-slate-600">
                          {formatDateRange(request.start_date, request.end_date)}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${statusClassName(
                              request.status,
                            )}`}
                          >
                            {request.status}
                          </span>
                          {request.faculty_remark && (
                            <p className="mt-2 max-w-xs text-xs text-slate-500">{request.faculty_remark}</p>
                          )}
                        </td>
                        <td className="max-w-xs px-5 py-4 text-slate-600">{request.description}</td>
                        <td className="px-5 py-4">
                          {request.proof_url ? (
                            <a
                              href={request.proof_url}
                              target="_blank"
                              rel="noreferrer"
                              className="font-medium text-blue-600 hover:text-blue-700 hover:underline"
                            >
                              View proof
                            </a>
                          ) : (
                            <span className="text-slate-400">No proof</span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          {isPending ? (
                            <div className="min-w-56 space-y-3">
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => openDecision(request.request_id, 'Approved')}
                                  className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-green-700"
                                >
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openDecision(request.request_id, 'Rejected')}
                                  className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700"
                                >
                                  Reject
                                </button>
                              </div>

                              {isActive && (
                                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                                  <label className="block">
                                    <span className="text-xs font-medium text-slate-700">
                                      Remark {activeDecision.status === 'Rejected' ? '(required)' : '(optional)'}
                                    </span>
                                    <input
                                      type="text"
                                      value={activeDecision.remark}
                                      onChange={handleRemarkChange}
                                      placeholder="Add a remark"
                                      className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                                    />
                                  </label>
                                  <div className="mt-3 flex gap-2">
                                    <button
                                      type="button"
                                      onClick={confirmDecision}
                                      disabled={updating}
                                      className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                      {updating ? 'Saving...' : 'Confirm'}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setActiveDecision(null)}
                                      disabled={updating}
                                      className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
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
    </div>
  )
}

export default FacultyDashboard
