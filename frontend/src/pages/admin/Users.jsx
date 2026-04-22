import { useState, useEffect } from 'react'
import api from '../../api/axios'
import { useLang } from '../../context/LangContext'
import { exportToExcel } from '../../utils/exportExcel'

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

export default function AdminUsers() {
  const { t } = useLang()
  const [users, setUsers] = useState([])
  const [modal, setModal] = useState(null)
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState({ username: '', password: '', name: '', role: 'deliverer' })
  const [error, setError] = useState('')

  async function load() {
    const { data } = await api.get('/users')
    setUsers(data)
  }
  useEffect(() => { load() }, [])

  function openAdd() {
    setForm({ username: '', password: '', name: '', role: 'deliverer' })
    setError('')
    setModal('add')
  }

  function openEdit(user) {
    setSelected(user)
    setForm({ username: user.username, password: '', name: user.name, role: user.role })
    setError('')
    setModal('edit')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    try {
      if (modal === 'add') {
        await api.post('/users', form)
      } else {
        const payload = { name: form.name, role: form.role }
        if (form.password) payload.password = form.password
        await api.put(`/users/${selected.id}`, payload)
      }
      setModal(null)
      load()
    } catch (err) {
      setError(err.response?.data?.message || 'Error')
    }
  }

  async function handleDelete(id) {
    if (!confirm(t('deleteUserConfirm'))) return
    await api.delete(`/users/${id}`)
    load()
  }

  function handleExport() {
    const rows = users.map(u => ({
      [t('name')]: u.name,
      [t('username')]: u.username,
      [t('role')]: u.role,
      [t('created')]: new Date(u.createdAt).toLocaleDateString(),
    }))
    exportToExcel(rows, 'users')
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">{t('users')}</h2>
        <div className="flex gap-2">
          <button onClick={handleExport} className="border border-gray-300 hover:bg-gray-50 text-gray-600 px-4 py-2 rounded-lg text-sm font-medium">
            ⬇ {t('exportExcel')}
          </button>
          <button onClick={openAdd} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
            + {t('addUser')}
          </button>
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {[t('name'), t('username'), t('role'), t('created'), t('actions')].map(h => (
                <th key={h} className="text-left px-6 py-3 text-gray-500 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-900">{u.name}</td>
                <td className="px-6 py-4 text-gray-600">{u.username}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${u.role === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                <td className="px-6 py-4 space-x-3">
                  <button onClick={() => openEdit(u)} className="text-blue-600 hover:underline text-sm">{t('edit')}</button>
                  <button onClick={() => handleDelete(u.id)} className="text-red-500 hover:underline text-sm">{t('delete')}</button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr><td colSpan={5} className="px-6 py-10 text-center text-gray-400">{t('noUsersFound')}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title={modal === 'add' ? t('addUser') : t('editUser')} onClose={() => setModal(null)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            {modal === 'add' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('username')}</label>
                <input
                  value={form.username}
                  onChange={e => setForm({ ...form, username: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('fullName')}</label>
              <input
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {modal === 'edit' ? t('newPassword') : t('password')}
              </label>
              <input
                type="password"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required={modal === 'add'}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('role')}</label>
              <select
                value={form.role}
                onChange={e => setForm({ ...form, role: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="deliverer">Deliverer</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <div className="flex gap-3 pt-2">
              <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium">
                {modal === 'add' ? t('create') : t('save')}
              </button>
              <button type="button" onClick={() => setModal(null)} className="flex-1 border border-gray-300 py-2 rounded-lg text-gray-600 hover:bg-gray-50">
                {t('cancel')}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
