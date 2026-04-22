import { useState, useEffect } from 'react'
import api from '../../api/axios'
import { useLang } from '../../context/LangContext'
import { exportToExcel } from '../../utils/exportExcel'

const WEIGHT_OPTIONS = ['0.25kg', '0.5kg', '1kg', '2kg', '5kg']

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

const emptyForm = { name: '', reference: '', category: '', price: '', weights: [] }

export default function AdminItems() {
  const { t } = useLang()
  const [items, setItems] = useState([])
  const [modal, setModal] = useState(null)
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')

  async function load() {
    const { data } = await api.get('/items')
    setItems(data)
  }
  useEffect(() => { load() }, [])

  function openAdd() {
    setForm(emptyForm)
    setError('')
    setModal('add')
  }

  function openEdit(item) {
    setSelected(item)
    setForm({ name: item.name, reference: item.reference, category: item.category, price: item.price, weights: [...item.weights] })
    setError('')
    setModal('edit')
  }

  function toggleWeight(w) {
    setForm(f => ({
      ...f,
      weights: f.weights.includes(w) ? f.weights.filter(x => x !== w) : [...f.weights, w]
    }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.weights.length) { setError(t('selectOneWeight')); return }
    try {
      if (modal === 'add') {
        await api.post('/items', form)
      } else {
        await api.put(`/items/${selected.id}`, form)
      }
      setModal(null)
      load()
    } catch (err) {
      setError(err.response?.data?.message || 'Error')
    }
  }

  async function handleDelete(id) {
    if (!confirm(t('deleteItemConfirm'))) return
    await api.delete(`/items/${id}`)
    load()
  }

  function handleExport() {
    const rows = items.map(item => ({
      [t('name')]: item.name,
      [t('reference')]: item.reference,
      [t('category')]: item.category,
      [t('price')]: item.price,
      [t('weights')]: item.weights.join(', '),
    }))
    exportToExcel(rows, 'items')
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">{t('items')}</h2>
        <div className="flex gap-2">
          <button onClick={handleExport} className="border border-gray-300 hover:bg-gray-50 text-gray-600 px-4 py-2 rounded-lg text-sm font-medium">
            ⬇ {t('exportExcel')}
          </button>
          <button onClick={openAdd} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
            + {t('addItem')}
          </button>
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {[t('name'), t('reference'), t('category'), t('price'), t('weights'), t('actions')].map(h => (
                <th key={h} className="text-left px-6 py-3 text-gray-500 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map(item => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-900">{item.name}</td>
                <td className="px-6 py-4 text-gray-500 font-mono text-xs">{item.reference}</td>
                <td className="px-6 py-4 text-gray-600">{item.category}</td>
                <td className="px-6 py-4 text-gray-900">{item.price} MAD</td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1">
                    {item.weights.map(w => (
                      <span key={w} className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">{w}</span>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4 space-x-3">
                  <button onClick={() => openEdit(item)} className="text-blue-600 hover:underline text-sm">{t('edit')}</button>
                  <button onClick={() => handleDelete(item.id)} className="text-red-500 hover:underline text-sm">{t('delete')}</button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={6} className="px-6 py-10 text-center text-gray-400">{t('noItemsYet')}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title={modal === 'add' ? t('addItem') : t('editItem')} onClose={() => setModal(null)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            {[['name', t('name')], ['reference', t('reference')], ['category', t('category')]].map(([field, label]) => (
              <div key={field}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                <input
                  value={form[field]}
                  onChange={e => setForm({ ...form, [field]: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            ))}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('price')} (MAD)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.price}
                onChange={e => setForm({ ...form, price: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('availableWeights')}</label>
              <div className="flex flex-wrap gap-2">
                {WEIGHT_OPTIONS.map(w => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => toggleWeight(w)}
                    className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                      form.weights.includes(w)
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'border-gray-300 text-gray-600 hover:border-blue-400'
                    }`}
                  >
                    {w}
                  </button>
                ))}
              </div>
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
