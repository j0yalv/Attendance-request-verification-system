import { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'
import { useNavigate } from 'react-router-dom'

const CATEGORIES = ['Hackathon', 'Workshop', 'Volunteering', 'Medical', 'Sports', 'Other']
const MAX_FILE_SIZE = 5 * 1024 * 1024
const ALLOWED_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']

const initialForm = {
  subject_code: '',
  faculty_id: '',
  category: 'Hackathon',
  description: '',
  start_date: '',
  end_date: '',
  proof: null,
}

function StudentDashboard() {
  const [student, setStudent] = useState(null)
  const [subjects, setSubjects] = useState([])
  const [facultyMap, setFacultyMap] = useState({})
  const [requests, setRequests] = useState([])
  const [formData, setFormData] = useState(initialForm)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const navigate = useNavigate()

  const fetchRequests = async (studentId) => {
    const { data, error: requestsError } = await supabase
      .from('requests')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
    if (requestsError) throw requestsError
    setRequests(data || [])
  }

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true)
      setError('')
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError) throw userError
        if (!user) throw new Error('Please log in again.')

        const { data: profile, error: profileError } = await supabase
          .from('students')
          .select('*')
          .eq('id', user.id)
          .single()
        if (profileError) throw profileError
        setStudent(profile)

        const { data: subjectRows, error: subjectsError } = await supabase
            .from('subjects')
            .select('subject_code, subject_name, semester')
            .eq('dept', profile.dept)
            .eq('semester', profile.semester)
            .order('subject_code')
        if (subjectsError) throw subjectsError
        setSubjects(subjectRows || [])

        const { data: fsRows, error: fsError } = await supabase
  .from('faculty_subjects')
  .select('subject_code, faculty_id')
  .eq('dept', profile.dept)
if (fsError) throw fsError

const subjectFacultyMap = {}
if (fsRows.length > 0) {
  const facultyIds = [...new Set(fsRows.map(r => r.faculty_id))]
  const { data: facultyRows } = await supabase
    .from('faculty')
    .select('id, name')
    .in('id', facultyIds)

  const fMap = {}
  facultyRows?.forEach(f => { fMap[f.id] = f.name })

  fsRows.forEach(r => {
    subjectFacultyMap[r.subject_code] = {
      faculty_id: r.faculty_id,
      faculty_name: fMap[r.faculty_id] || 'Unknown',
    }
  })
}
setFacultyMap(subjectFacultyMap)

        await fetchRequests(profile.id)
      } catch (err) {
        setError(err.message || 'Unable to load dashboard.')
      } finally {
        setLoading(false)
      }
    }
    fetchDashboardData()
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    if (name === 'subject_code') {
      // Auto-assign faculty when subject is selected
      const assigned = facultyMap[value]
      setFormData(cur => ({
        ...cur,
        subject_code: value,
        faculty_id: assigned?.faculty_id || '',
      }))
    } else {
      setFormData(cur => ({ ...cur, [name]: value }))
    }
  }

  const handleProofChange = (e) => {
    setError('')
    const file = e.target.files?.[0] || null
    if (!file) { setFormData(cur => ({ ...cur, proof: null })); return }
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      setError('Proof must be a PDF, JPG, JPEG, or PNG file.')
      e.target.value = ''
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      setError('Proof file must be 5 MB or smaller.')
      e.target.value = ''
      return
    }
    setFormData(cur => ({ ...cur, proof: file }))
  }

  const uploadProof = async (file) => {
    if (!file) return null
    const extension = file.name.split('.').pop()
    const fileName = `${student.id}/${Date.now()}.${extension}`
    const { error: uploadError } = await supabase.storage
      .from('proofs')
      .upload(fileName, file, { cacheControl: '3600', upsert: false })
    if (uploadError) throw uploadError
    const { data } = supabase.storage.from('proofs').getPublicUrl(fileName)
    return data.publicUrl
  }

  const validateForm = () => {
    if (!formData.subject_code) return 'Please select a subject.'
    if (!formData.faculty_id) return 'No faculty assigned to this subject yet.'
    if (!formData.description.trim()) return 'Please add a description.'
    if (!formData.start_date || !formData.end_date) return 'Please select both dates.'
    if (formData.end_date < formData.start_date) return 'End date cannot be before start date.'
    return ''
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    const validationError = validateForm()
    if (validationError) { setError(validationError); return }
    setSubmitting(true)
    try {
      const proofUrl = await uploadProof(formData.proof)
      const { error: insertError } = await supabase.from('requests').insert({
        student_id: student.id,
        faculty_id: formData.faculty_id,
        subject_code: formData.subject_code,
        dept: student.dept,
        category: formData.category,
        description: formData.description.trim(),
        start_date: formData.start_date,
        end_date: formData.end_date,
        proof_url: proofUrl,
        status: 'Pending',
      })
      if (insertError) throw insertError
      setFormData(initialForm)
      e.target.reset()
      setSuccess('Request submitted successfully.')
      await fetchRequests(student.id)
    } catch (err) {
      setError(err.message || 'Unable to submit request.')
    } finally {
      setSubmitting(false)
    }
  }

  const formatDateRange = (start, end) => {
    const opts = { day: 'numeric', month: 'short', year: 'numeric' }
    const s = new Date(start).toLocaleDateString(undefined, opts)
    const e = new Date(end).toLocaleDateString(undefined, opts)
    return start === end ? s : `${s} - ${e}`
  }

  const statusClass = (status) => ({
    Pending: 'bg-yellow-100 text-yellow-800 ring-1 ring-yellow-200',
    Approved: 'bg-green-100 text-green-800 ring-1 ring-green-200',
    Rejected: 'bg-red-100 text-red-800 ring-1 ring-red-200',
  }[status] || 'bg-gray-100 text-gray-700')

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="rounded-lg bg-white px-6 py-4 text-sm text-slate-600 shadow-sm ring-1 ring-slate-200">
        Loading dashboard...
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">

        <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-blue-600">Student Dashboard</p>
            <h1 className="text-2xl font-bold text-slate-900">
              Welcome{student?.name ? `, ${student.name}` : ''}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {student?.dept} — Semester {student?.semester}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
              {requests.length} request{requests.length === 1 ? '' : 's'} submitted
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
          <div className={`rounded-lg border px-4 py-3 text-sm ${
            error ? 'border-red-200 bg-red-50 text-red-700' : 'border-green-200 bg-green-50 text-green-700'
          }`}>
            {error || success}
          </div>
        )}

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-slate-900">New attendance request</h2>
            <p className="mt-1 text-sm text-slate-500">Submit co-curricular, medical, or sports consideration details.</p>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-4 lg:grid-cols-2">
            <label className="block lg:col-span-2">
              <span className="text-sm font-medium text-slate-700">Subject</span>
              <select
                name="subject_code"
                value={formData.subject_code}
                onChange={handleChange}
                required
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                <option value="">Select subject</option>
                {subjects.map(s => (
                  <option key={s.subject_code} value={s.subject_code}>
                    {s.subject_code} — {s.subject_name}
                    {facultyMap[s.subject_code]
                      ? ` (${facultyMap[s.subject_code].faculty_name})`
                      : ' (no faculty assigned)'}
                  </option>
                ))}
              </select>
              {formData.subject_code && facultyMap[formData.subject_code] && (
                <p className="mt-1 text-xs text-slate-500">
                  Request will be sent to <span className="font-medium text-slate-700">
                    {facultyMap[formData.subject_code].faculty_name}
                  </span>
                </p>
              )}
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Category</span>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                required
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Proof file</span>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleProofChange}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100 focus:outline-none"
              />
              <span className="mt-1 block text-xs text-slate-500">Optional. PDF, JPG, JPEG, or PNG up to 5 MB.</span>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Start date</span>
              <input
                name="start_date"
                type="date"
                value={formData.start_date}
                onChange={handleChange}
                required
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">End date</span>
              <input
                name="end_date"
                type="date"
                value={formData.end_date}
                onChange={handleChange}
                required
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </label>

            <label className="block lg:col-span-2">
              <span className="text-sm font-medium text-slate-700">Description</span>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                rows="4"
                placeholder="Describe the event, reason, or activity for this request."
                className="mt-1 w-full resize-none rounded-lg border border-slate-300 px-3 py-2.5 text-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </label>

            <div className="lg:col-span-2">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {submitting ? 'Submitting...' : 'Submit request'}
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-lg font-semibold text-slate-900">My requests</h2>
          </div>
          {requests.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <p className="text-sm text-slate-500">No requests yet. Submit one above.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3 text-left">Subject</th>
                    <th className="px-5 py-3 text-left">Faculty</th>
                    <th className="px-5 py-3 text-left">Category</th>
                    <th className="px-5 py-3 text-left">Dates</th>
                    <th className="px-5 py-3 text-left">Status</th>
                    <th className="px-5 py-3 text-left">Remark</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {requests.map(req => (
                    <tr key={req.request_id}>
                      <td className="px-5 py-4 font-medium text-slate-900">{req.subject_code}</td>
                      <td className="px-5 py-4 text-slate-600">
                        {facultyMap[req.subject_code]?.faculty_name || '—'}
                      </td>
                      <td className="px-5 py-4 text-slate-600">{req.category}</td>
                      <td className="px-5 py-4 text-slate-600">{formatDateRange(req.start_date, req.end_date)}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(req.status)}`}>
                          {req.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        {req.faculty_remark || <span className="text-slate-400">No remark</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

      </div>
    </div>
  )
}

export default StudentDashboard
