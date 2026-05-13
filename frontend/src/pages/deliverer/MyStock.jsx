import { useState, useEffect } from 'react'
import api from '../../api/axios'
import { useLang } from '../../context/LangContext'

export default function DelivererMyStock() {
  const { t } = useLang()
  const [stock, setStock] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/stock/my')
      .then(({ data }) => setStock(data))
      .finally(() => setLoading(false))
  }, [])

  const visible = stock.filter(s => s.quantity > 0)

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('myStock')}</h2>
      <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full min-w-[400px] text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {[t('name'), t('weights'), t('stockQty')].map(h => (
                <th key={h} className="text-left px-6 py-3 text-gray-500 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && (
              <tr><td colSpan={3} className="px-6 py-10 text-center text-gray-400">{t('loading')}</td></tr>
            )}
            {!loading && visible.map(s => (
              <tr key={`${s.itemId}-${s.weight}`} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-900">{s.itemName}</td>
                <td className="px-6 py-4">
                  <span className="bg-green-50 text-green-700 text-xs px-2 py-0.5 rounded-full">{s.weight}</span>
                </td>
                <td className="px-6 py-4">
                  <span className={`font-semibold ${s.quantity < 5 ? 'text-amber-500' : 'text-gray-900'}`}>
                    {s.quantity}
                  </span>
                </td>
              </tr>
            ))}
            {!loading && visible.length === 0 && (
              <tr>
                <td colSpan={3} className="px-6 py-10 text-center text-gray-400">{t('noStockYet')}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
