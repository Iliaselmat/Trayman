import { useState, useEffect } from 'react'
import api from '../../api/axios'
import { useLang } from '../../context/LangContext'
import { exportToExcel } from '../../utils/exportExcel'

const WEIGHT_OPTIONS = ['0.25kg', '0.5kg', '1kg', '2kg', '5kg']

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b shrink-0">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <div className="p-6 overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}

const emptyForm = { name: '', reference: '', category: '', weights: [] }

function normalizeWeights(raw) {
  // Convert both old string[] and new {weight,price}[] to {weight,price}[]
  return raw.map(w => typeof w === 'object' ? { weight: w.weight, price: String(w.price) } : { weight: w, price: '' })
}

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
    setForm({
      name: item.name,
      reference: item.reference,
      category: item.category,
      weights: normalizeWeights(item.weights),
    })
    setError('')
    setModal('edit')
  }

  function isWeightSelected(w) {
    return !!form.weights.find(ww => ww.weight === w)
  }

  function toggleWeight(w) {
    if (isWeightSelected(w)) {
      setForm(f => ({ ...f, weights: f.weights.filter(ww => ww.weight !== w) }))
    } else {
      setForm(f => ({ ...f, weights: [...f.weights, { weight: w, price: '' }] }))
    }
  }

  function updateWeightPrice(w, price) {
    setForm(f => ({
      ...f,
      weights: f.weights.map(ww => ww.weight === w ? { ...ww, price } : ww)
    }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.weights.length) { setError(t('selectOneWeight')); return }
    const badPrice = form.weights.some(ww => !ww.price || parseFloat(ww.price) <= 0)
    if (badPrice) { setError(t('allWeightsPriceRequired')); return }
    try {
      const payload = {
        name: form.name,
        reference: form.reference,
        category: form.category,
        weights: form.weights.map(ww => ({ weight: ww.weight, price: parseFloat(ww.price) })),
      }
      if (modal === 'add') {
        await api.post('/items', payload)
      } else {
        await api.put(`/items/${selected.id}`, payload)
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
      [t('weights')]: item.weights.map(w =>
        typeof w === 'object' ? `${w.weight}:${w.price}MAD` : w
      ).join(', '),
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

      <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full min-w-[600px] text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {[t('name'), t('reference'), t('category'), t('weights'), t('actions')].map(h => (
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
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1">
                    {item.weights.map(w => {
                      const label = typeof w === 'object' ? w.weight : w
                      const price = typeof w === 'object' ? w.price : item.price
                      return (
                        <span key={label} className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full whitespace-nowrap">
                          {label} — {parseFloat(price).toFixed(2)} MAD
                        </span>
                      )
                    })}
                  </div>
                </td>
                <td className="px-6 py-4 space-x-3">
                  <button onClick={() => openEdit(item)} className="text-blue-600 hover:underline text-sm">{t('edit')}</button>
                  <button onClick={() => handleDelete(item.id)} className="text-red-500 hover:underline text-sm">{t('delete')}</button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={5} className="px-6 py-10 text-center text-gray-400">{t('noItemsYet')}</td></tr>
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
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('availableWeights')}</label>
              <div className="space-y-2">
                {WEIGHT_OPTIONS.map(w => {
                  const sel = form.weights.find(ww => ww.weight === w)
                  return (
                    <div
                      key={w}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg border transition-colors ${
                        sel ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => toggleWeight(w)}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                          sel ? 'bg-blue-600 border-blue-600' : 'border-gray-300 bg-white'
                        }`}
                      >
                        {sel && (
                          <svg className="w-3 h-3 text-white" viewBox="0 0 12 10" fill="none">
                            <path d="M1 5l3.5 4L11 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </button>
                      <span className={`text-sm w-14 shrink-0 font-medium ${sel ? 'text-blue-800' : 'text-gray-400'}`}>{w}</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={sel?.price ?? ''}
                        onChange={e => sel && updateWeightPrice(w, e.target.value)}
                        onClick={() => !sel && toggleWeight(w)}
                        disabled={!sel}
                        placeholder="0.00"
                        className={`flex-1 min-w-0 border rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                          !sel ? 'bg-gray-100 text-gray-300 cursor-not-allowed' : ''
                        }`}
                      />
                      <span className={`text-sm shrink-0 ${sel ? 'text-gray-600' : 'text-gray-300'}`}>MAD</span>
                    </div>
                  )
                })}
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
