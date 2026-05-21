import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'

function Signup() {
  const navigate = useNavigate()
  const [role, setRole] = useState('student')
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    dept: '',
    semester: '',
    usn: '',
  })
  const [subjects, setSubjects] = useState([])
  const [selectedSubjects, setSelectedSubjects] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  useEffect(() => {
    if (role === 'faculty' && formData.dept.trim()) {
      const fetchSubjects = async () => {
        const { data } = await supabase
          .from('subjects')
          .select('subject_code, subject_name, semester')
          .eq('dept', formData.dept.trim())
          .order('semester')
        setSubjects(data || [])
      }
      fetchSubjects()
    } else {
      setSubjects([])
      setSelectedSubjects([])
    }
  }, [role, formData.dept])

  const toggleSubject = (code) => {
    setSelectedSubjects(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    )
  }

  const handleSignup = async (e) => {
    e.preventDefault()
    setError('')

    if (!formData.email.endsWith('@pace.edu.in')) {
      setError('Use your college email (@pace.edu.in) only')
      return
    }

    if (role === 'student' && !formData.usn) {
      setError('USN is required for students')
      return
    }

    if (role === 'faculty' && selectedSubjects.length === 0) {
      setError('Please select at least one subject you teach')
      return
    }

    setLoading(true)

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    const userId = authData.user.id

    if (role === 'student') {
      const { error: profileError } = await supabase.from('students').insert({
        id: userId,
        name: formData.name,
        email: formData.email,
        dept: formData.dept,
        semester: parseInt(formData.semester),
        usn: formData.usn,
      })
      if (profileError) {
        setError(profileError.message)
        setLoading(false)
        return
      }
      navigate('/student/dashboard')
    } else {
      const { error: profileError } = await supabase.from('faculty').insert({
        id: userId,
        name: formData.name,
        email: formData.email,
        dept: formData.dept,
      })
      if (profileError) {
        setError(profileError.message)
        setLoading(false)
        return
      }

      const subjectRows = selectedSubjects.map(code => ({
        faculty_id: userId,
        subject_code: code,
        dept: formData.dept,
      }))

      const { error: subjectError } = await supabase
        .from('faculty_subjects')
        .insert(subjectRows)

      if (subjectError) {
        setError(subjectError.message)
        setLoading(false)
        return
      }

      navigate('/faculty/dashboard')
    }

    setLoading(false)
  }

  return (
    <div className="auth-shell">
      <div className="auth-panel">
      <div className="auth-card">
        <p className="auth-brand">AttendFlow</p>
        <h1 className="auth-title">Create account</h1>
        <p className="auth-copy mb-6">Use your @pace.edu.in email</p>

        <div className="mb-6 grid grid-cols-2 rounded-lg border border-slate-200 bg-slate-100 p-1">
          <button
            className={`rounded-md py-2 text-sm font-semibold transition ${role === 'student' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            onClick={() => setRole('student')}
            type="button"
          >
            Student
          </button>
          <button
            className={`rounded-md py-2 text-sm font-semibold transition ${role === 'faculty' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            onClick={() => setRole('faculty')}
            type="button"
          >
            Faculty
          </button>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <input
            name="name"
            type="text"
            placeholder="Full Name"
            value={formData.name}
            onChange={handleChange}
            required
            className="field-input"
          />
          <input
            name="email"
            type="email"
            placeholder="College Email"
            value={formData.email}
            onChange={handleChange}
            required
            className="field-input"
          />
          <input
            name="password"
            type="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            required
            className="field-input"
          />
          <input
            name="dept"
            type="text"
            placeholder="Department (e.g. AIML)"
            value={formData.dept}
            onChange={handleChange}
            required
            className="field-input"
          />

          {role === 'student' && (
            <>
              <input
                name="usn"
                type="text"
                placeholder="USN"
                value={formData.usn}
                onChange={handleChange}
                required
                className="field-input"
              />
              <input
                name="semester"
                type="number"
                placeholder="Semester (e.g. 4)"
                value={formData.semester}
                onChange={handleChange}
                required
                min="1"
                max="8"
                className="field-input"
              />
            </>
          )}

          {role === 'faculty' && subjects.length > 0 && (
            <div>
              <p className="field-label mb-2">
                Select subjects you teach
              </p>
              <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-3">
                {subjects.map(s => (
                  <label key={s.subject_code} className="flex cursor-pointer items-start gap-3 rounded-md p-2 transition hover:bg-white">
                    <input
                      type="checkbox"
                      checked={selectedSubjects.includes(s.subject_code)}
                      onChange={() => toggleSubject(s.subject_code)}
                      className="mt-1 accent-blue-600"
                    />
                    <span className="text-sm leading-5 text-slate-700">
                      {s.subject_code} - {s.subject_name}
                      <span className="ml-1 text-slate-400">(Sem {s.semester})</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {role === 'faculty' && formData.dept && subjects.length === 0 && (
            <p className="helper-text">
              No subjects found for {formData.dept}
            </p>
          )}

          {error && <p className="alert alert-error">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-blue-700 hover:underline">Log in</Link>
        </p>
      </div>
      </div>
    </div>
  )
}

export default Signup
