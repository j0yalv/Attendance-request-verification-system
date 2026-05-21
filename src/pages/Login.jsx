import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'

function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    const userId = data.user.id

    // Check which table this user belongs to
    const { data: studentData } = await supabase
      .from('students')
      .select('id')
      .eq('id', userId)
      .single()

    if (studentData) {
      navigate('/student/dashboard')
      return
    }

    const { data: facultyData } = await supabase
      .from('faculty')
      .select('id')
      .eq('id', userId)
      .single()

    if (facultyData) {
      navigate('/faculty/dashboard')
      return
    }

    setError('Account not found. Please sign up first.')
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
              <p className="text-sm text-slate-500">Academic access portal</p>
            </div>
          </div>
          <h1 className="auth-title">Welcome back</h1>
          <p className="auth-copy mb-6">Sign in with your @pace.edu.in email</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="email"
              placeholder="College Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="field-input min-h-11 w-full text-base"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="field-input min-h-11 w-full text-base"
            />

            {error && <p className="alert alert-error">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary min-h-11 w-full text-base"
            >
              {loading ? 'Signing in...' : 'Log In'}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-slate-500">
            Don't have an account?{' '}
            <Link to="/signup" className="font-semibold text-indigo-700 hover:underline">Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login
