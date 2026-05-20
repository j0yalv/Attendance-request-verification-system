import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

function ProtectedRoute({ children, role }) {
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setAuthorized(false)
        setLoading(false)
        return
      }

      // Check if user exists in the correct role table
      const table = role === 'student' ? 'students' : 'faculty'
      const { data, error } = await supabase
        .from(table)
        .select('id')
        .eq('id', user.id)
        .single()

      setAuthorized(!!data && !error)
      setLoading(false)
    }

    checkAuth()
  }, [role])

  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>
  if (!authorized) return <Navigate to="/login" />
  return children
}

export default ProtectedRoute