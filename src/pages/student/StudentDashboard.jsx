import { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'
import { useNavigate } from 'react-router-dom'

const CATEGORIES = ['Hackathon', 'Workshop', 'Volunteering', 'Medical', 'Sports', 'Other']
const MAX_FILE_SIZE = 5 * 1024 * 1024
const ALLOWED_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']

const initialForm = {
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
  const [selectedSubjects, setSelectedSubjects] = useState([])
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

  const toggleSubject = (code) => {
    setSelectedSubjects(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    )
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
    if (selectedSubjects.length === 0) return 'Please select at least one subject.'
    if (selectedSubjects.some(code => !facultyMap[code]?.faculty_id))
      return 'One or more selected subjects have no faculty assigned.'
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
      const inserts = selectedSubjects.map(code => ({
        student_id: student.id,
        faculty_id: facultyMap[code].faculty_id,
        subject_code: code,
        dept: student.dept,
        category: formData.category,
        description: formData.description.trim(),
        start_date: formData.start_date,
        end_date: formData.end_date,
        proof_url: proofUrl,
        status: 'Pending',
      }))
      const { error: insertError } = await supabase
        .from('requests')
        .insert(inserts)
      if (insertError) throw insertError
      setFormData(initialForm)
      setSelectedSubjects([])
      e.target.reset()
      setSuccess(`${inserts.length} request${inserts.length > 1 ? 's' : ''} submitted successfully.`)
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
    Pending: 'status-pending',
    Approved: 'status-approved',
    Rejected: 'status-rejected',
  }[status] || 'status-neutral')

  if (loading) return (
    <div className="app-shell flex items-center justify-center">
      <div className="loading-card">
        Loading dashboard...
      </div>
    </div>
  )

  return (
    <div className="app-shell">
      <div className="page-frame">

        <header className="dashboard-header dashboard-header-inner">
          <div>
            <p className="eyebrow">Student Dashboard</p>
            <h1 className="page-title">
              Welcome{student?.name ? `, ${student.name}` : ''}
            </h1>
            <p className="muted-copy">
              {student?.dept} - Semester {student?.semester}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="metric-pill">
              {requests.length} request{requests.length === 1 ? '' : 's'} submitted
            </div>
            <button
              onClick={async () => {
                await supabase.auth.signOut()
                navigate('/login')
              }}
              className="btn-secondary"
            >
              Sign out
            </button>
          </div>
        </header>

        {(error || success) && (
          <div className={`alert ${
            error ? 'alert-error' : 'alert-success'
          }`}>
            {error || success}
          </div>
        )}

        <section className="surface-card">
          <div className="section-heading">
            <h2 className="section-title">New attendance request</h2>
            <p className="section-subtitle">Submit co-curricular, medical, or sports consideration details.</p>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-5 p-5 sm:p-6 lg:grid-cols-2">
            <div className="block lg:col-span-2">
              <span className="text-sm font-medium text-slate-700">Subjects</span>
              <p className="text-xs text-slate-500 mb-2">Select all subjects you were absent for</p>
              <div className="border border-slate-300 rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto">
                {subjects.map(s => {
                  const assigned = facultyMap[s.subject_code]
                  return (
                    <label key={s.subject_code} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedSubjects.includes(s.subject_code)}
                        onChange={() => toggleSubject(s.subject_code)}
                        className="accent-blue-600"
                      />
                      <span className="text-sm text-slate-700">
                        {s.subject_code} — {s.subject_name}
                        {assigned
                          ? <span className="text-slate-400 ml-1">({assigned.faculty_name})</span>
                          : <span className="text-red-400 ml-1">(no faculty assigned)</span>}
                      </span>
                    </label>
                  )
                })}
              </div>
            </div>

            <label className="block">
              <span className="field-label">Category</span>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                required
                className="field-input"
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>

            <label className="block">
              <span className="field-label">Proof file</span>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleProofChange}
                className="file-input"
              />
              <span className="helper-text">Optional. PDF, JPG, JPEG, or PNG up to 5 MB.</span>
            </label>

            <label className="block">
              <span className="field-label">Start date</span>
              <input
                name="start_date"
                type="date"
                value={formData.start_date}
                onChange={handleChange}
                required
                className="field-input"
              />
            </label>

            <label className="block">
              <span className="field-label">End date</span>
              <input
                name="end_date"
                type="date"
                value={formData.end_date}
                onChange={handleChange}
                required
                className="field-input"
              />
            </label>

            <label className="block lg:col-span-2">
              <span className="field-label">Description</span>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                rows="4"
                placeholder="Describe the event, reason, or activity for this request."
                className="field-input min-h-28 resize-none"
              />
            </label>

            <div className="lg:col-span-2">
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary w-full sm:w-auto"
              >
                {submitting ? 'Submitting...' : 'Submit request'}
              </button>
            </div>
          </form>
        </section>

        <section className="surface-card">
          <div className="section-heading">
            <h2 className="section-title">My requests</h2>
            <p className="section-subtitle">Track every submitted request and faculty remark.</p>
          </div>
          {requests.length === 0 ? (
            <div className="empty-state">
              <h3 className="text-base font-semibold text-slate-950">No requests yet</h3>
              <p className="mt-1 text-sm text-slate-500">Submit one above and it will appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>Faculty</th>
                    <th>Category</th>
                    <th>Dates</th>
                    <th>Status</th>
                    <th>Remark</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map(req => (
                    <tr key={req.request_id}>
                      <td className="font-semibold text-slate-950">{req.subject_code}</td>
                      <td className="text-slate-600">
                        {facultyMap[req.subject_code]?.faculty_name || '-'}
                      </td>
                      <td className="text-slate-600">{req.category}</td>
                      <td className="text-slate-600">{formatDateRange(req.start_date, req.end_date)}</td>
                      <td>
                        <span className={`status-pill ${statusClass(req.status)}`}>
                          {req.status}
                        </span>
                      </td>
                      <td className="max-w-xs text-slate-600">
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
