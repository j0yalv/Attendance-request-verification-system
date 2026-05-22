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
    const { name, value } = e.target

    setFormData({
      ...formData,
      [name]:
        name === 'dept'
          ? value.toUpperCase()
          : value,
    })
  }

  useEffect(() => {
  const fetchSubjects = async () => {
    if (role !== 'faculty') {
      setSubjects([])
      setSelectedSubjects([])
      return
    }

    const normalizedDept = formData.dept
      .trim()
      .toUpperCase()

    if (!normalizedDept) {
      setSubjects([])
      return
    }

    console.log('Fetching for:', normalizedDept)

    const { data, error } = await supabase
      .from('subjects')
      .select('subject_code, subject_name, semester')
      .eq('dept', normalizedDept)
      .order('semester')

    console.log('Returned subjects:', data)

    if (error) {
      console.error(error)
      return
    }

    setSubjects(data || [])
  }

  const timeout = setTimeout(() => {
    fetchSubjects()
  }, 300)

  return () => clearTimeout(timeout)
}, [role, formData.dept])

  const toggleSubject = (code) => {
    setSelectedSubjects(prev =>
      prev.includes(code)
        ? prev.filter(c => c !== code)
        : [...prev, code]
    )
  }

  const handleSignup = async (e) => {
    e.preventDefault()

    setError('')

    if (!formData.email.endsWith('@pace.edu.in')) {
      setError('Use your college email only')
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
    if (role === 'student') {
      const emailPrefix = formData.email.split('@')[0].toUpperCase()
      const usn = formData.usn.toUpperCase()
      if (emailPrefix !== usn) {
        setError('Email must match your USN')
        return
      }
    }

    const validDepts = ['AIML', 'CSE', 'EC', 'BT', 'ICSB']
    if (!validDepts.includes(formData.dept.toUpperCase())) {
      setError('Department must be one of: AIML, CSE, EC, BT, ICSB')
      return
    }
    const usnRegex = /^4PA(22|23|24|25)(AI|CS|IC|EC|BT)[0-9]{3}$/
    if (!usnRegex.test(formData.usn.toUpperCase())) {
      setError('Enter a valid PACE USN')
      return
    }

    setLoading(true)

    const normalizedDept = formData.dept
      .trim()
      .toUpperCase()

    const { data: authData, error: authError } =
      await supabase.auth.signUp({
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
      const { error: profileError } = await supabase
        .from('students')
        .insert({
          id: userId,
          name: formData.name,
          email: formData.email,
          dept: normalizedDept,
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
      const { error: profileError } = await supabase
        .from('faculty')
        .insert({
          id: userId,
          name: formData.name,
          email: formData.email,
          dept: normalizedDept,
        })

      if (profileError) {
        setError(profileError.message)
        setLoading(false)
        return
      }

      const subjectRows = selectedSubjects.map(code => ({
        faculty_id: userId,
        subject_code: code,
        dept: normalizedDept,
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
    <div className="auth-shell min-h-screen flex items-center justify-center px-4 sm:px-8">
      <div className="auth-panel w-full max-w-md sm:max-w-lg">
        <div className="auth-card w-full p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <span className="brand-mark">AF</span>

            <div>
              <p className="auth-brand">AttendFlow</p>

              <p className="text-sm text-slate-500">
                Academic account setup
              </p>
            </div>
          </div>

          <h1 className="auth-title">
            Create account
          </h1>

          <p className="auth-copy mb-6">
            Use your @pace.edu.in email
          </p>

          <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 rounded-xl border border-slate-200 bg-slate-100 p-1">
            <button
              className={`min-h-11 rounded-lg py-2 text-sm font-semibold transition ${
                role === 'student'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              onClick={() => setRole('student')}
              type="button"
            >
              Student
            </button>

            <button
              className={`min-h-11 rounded-lg py-2 text-sm font-semibold transition ${
                role === 'faculty'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
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
              className="field-input min-h-11 w-full text-base"
            />

            <input
              name="email"
              type="email"
              placeholder="College Email"
              value={formData.email}
              onChange={handleChange}
              required
              className="field-input min-h-11 w-full text-base"
            />

            <input
              name="password"
              type="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              required
              className="field-input min-h-11 w-full text-base"
            />

            <select
              name="dept"
              value={formData.dept}
              onChange={handleChange}
              required
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Department</option>
              <option value="AIML">AIML</option>
              <option value="CSE">CSE</option>
              <option value="EC">EC</option>
              <option value="BT">BT</option>
              <option value="ICSB">ICSB</option>
            </select>

            {role === 'student' && (
              <>
                <input
                  name="usn"
                  type="text"
                  placeholder="USN"
                  value={formData.usn}
                  onChange={handleChange}
                  required
                  className="field-input min-h-11"
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
                  className="field-input min-h-11"
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
                    <label
                      key={s.subject_code}
                      className="flex cursor-pointer items-start gap-3 rounded-md p-2 transition hover:bg-white"
                    >
                      <input
                        type="checkbox"
                        checked={selectedSubjects.includes(s.subject_code)}
                        onChange={() => toggleSubject(s.subject_code)}
                        className="mt-1 min-h-5 min-w-5 accent-blue-600"
                      />

                      <span className="text-sm leading-5 text-slate-700">
                        {s.subject_code} - {s.subject_name}

                        <span className="ml-1 text-slate-400">
                          (Sem {s.semester})
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {role === 'faculty' &&
              formData.dept &&
              subjects.length === 0 && (
                <p className="helper-text">
                  No subjects found for {formData.dept}
                </p>
              )}

            {error && (
              <p className="alert alert-error">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary min-h-11 w-full text-base"
            >
              {loading
                ? 'Creating account...'
                : 'Sign Up'}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-slate-500">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-semibold text-indigo-700 hover:underline"
            >
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Signup