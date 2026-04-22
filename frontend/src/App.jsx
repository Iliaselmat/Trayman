import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { LangProvider } from './context/LangContext'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import AdminLayout from './components/AdminLayout'
import DelivererLayout from './components/DelivererLayout'
import Login from './pages/Login'
import AdminDashboard from './pages/admin/Dashboard'
import AdminUsers from './pages/admin/Users'
import AdminItems from './pages/admin/Items'
import AdminClients from './pages/admin/Clients'
import AdminOrders from './pages/admin/Orders'
import DelivererDashboard from './pages/deliverer/Dashboard'
import DelivererClients from './pages/deliverer/Clients'
import DelivererOrders from './pages/deliverer/Orders'

export default function App() {
  return (
    <LangProvider>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/admin"
              element={
                <ProtectedRoute role="admin">
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<AdminDashboard />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="items" element={<AdminItems />} />
              <Route path="clients" element={<AdminClients />} />
              <Route path="orders" element={<AdminOrders />} />
            </Route>
            <Route
              path="/deliverer"
              element={
                <ProtectedRoute role="deliverer">
                  <DelivererLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<DelivererDashboard />} />
              <Route path="clients" element={<DelivererClients />} />
              <Route path="orders" element={<DelivererOrders />} />
            </Route>
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </LangProvider>
  )
}
