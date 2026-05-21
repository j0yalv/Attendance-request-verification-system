import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/Signup'
import StudentDashboard from './pages/student/StudentDashboard'
import FacultyDashboard from './pages/faculty/FacultyDashboard'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/student/dashboard" element={
          <ProtectedRoute role="student">
            <StudentDashboard />
          </ProtectedRoute>
        } />
        <Route path="/faculty/dashboard" element={
          <ProtectedRoute role="faculty">
            <FacultyDashboard />
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  )
}

export default App
