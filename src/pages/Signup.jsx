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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-md w-full max-w-md p-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Create Account</h1>
        <p className="text-gray-500 text-sm mb-6">Use your @pace.edu.in email</p>

        <div className="flex rounded-lg overflow-hidden border border-gray-200 mb-6">
          <button
            className={`flex-1 py-2 text-sm font-medium transition-colors ${role === 'student' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
            onClick={() => setRole('student')}
            type="button"
          >
            Student
          </button>
          <button
            className={`flex-1 py-2 text-sm font-medium transition-colors ${role === 'faculty' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
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
            className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            name="email"
            type="email"
            placeholder="College Email"
            value={formData.email}
            onChange={handleChange}
            required
            className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            name="password"
            type="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            required
            className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            name="dept"
            type="text"
            placeholder="Department (e.g. AIML)"
            value={formData.dept}
            onChange={handleChange}
            required
            className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </>
          )}

          {role === 'faculty' && subjects.length > 0 && (
            <div>
              <p className="text-sm text-gray-600 mb-2 font-medium">
                Select subjects you teach
              </p>
              <div className="border border-gray-200 rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto">
                {subjects.map(s => (
                  <label key={s.subject_code} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedSubjects.includes(s.subject_code)}
                      onChange={() => toggleSubject(s.subject_code)}
                      className="accent-blue-600"
                    />
                    <span className="text-sm text-gray-700">
                      {s.subject_code} — {s.subject_name}
                      <span className="text-gray-400 ml-1">(Sem {s.semester})</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {role === 'faculty' && formData.dept && subjects.length === 0 && (
            <p className="text-sm text-gray-400">
              No subjects found for {formData.dept}
            </p>
          )}

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          Already have an account?{' '}
          <Link to="/login" className="text-blue-600 hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  )
}

export default Signup