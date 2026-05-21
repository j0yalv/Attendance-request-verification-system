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
    <div className="auth-shell">
      <div className="auth-panel">
      <div className="auth-card">
        <p className="auth-brand">AttendFlow</p>
        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-copy mb-6">Sign in with your @pace.edu.in email</p>

        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            placeholder="College Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="field-input"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="field-input"
          />

          {error && <p className="alert alert-error">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading ? 'Signing in...' : 'Log In'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-500">
          Don't have an account?{' '}
          <Link to="/signup" className="font-semibold text-blue-700 hover:underline">Sign up</Link>
        </p>
      </div>
      </div>
    </div>
  )
}

export default Login
