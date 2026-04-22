import { useState, useEffect } from 'react'
import api from '../../api/axios'
import { useLang } from '../../context/LangContext'

function StatCard({ label, value, color }) {
  return (
    <div className={`bg-white rounded-xl p-6 shadow-sm border-l-4 ${color}`}>
      <p className="text-gray-500 text-sm">{label}</p>
      <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
    </div>
  )
}

export default function AdminDashboard() {
  const { t } = useLang()
  const [stats, setStats] = useState(null)

  useEffect(() => {
    async function load() {
      const [users, items, clients, orders] = await Promise.all([
        api.get('/users'),
        api.get('/items'),
        api.get('/clients'),
        api.get('/orders'),
      ])
      setStats({
        users: users.data.length,
        deliverers: users.data.filter(u => u.role === 'deliverer').length,
        items: items.data.length,
        clients: clients.data.length,
        orders: orders.data.length,
        processing: orders.data.filter(o => o.status === 'processing').length,
        delivered: orders.data.filter(o => o.status === 'delivered').length,
        cancelled: orders.data.filter(o => o.status === 'cancelled').length,
      })
    }
    load()
  }, [])

  if (!stats) return <p className="text-gray-500">{t('loading')}</p>

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('dashboard')}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label={t('totalUsers')} value={stats.users} color="border-blue-500" />
        <StatCard label={t('deliverers')} value={stats.deliverers} color="border-indigo-500" />
        <StatCard label={t('items')} value={stats.items} color="border-purple-500" />
        <StatCard label={t('clients')} value={stats.clients} color="border-pink-500" />
      </div>
      <h3 className="text-lg font-semibold text-gray-800 mb-4">{t('ordersOverview')}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatCard label={t('totalOrders')} value={stats.orders} color="border-gray-400" />
        <StatCard label={t('processing')} value={stats.processing} color="border-yellow-400" />
        <StatCard label={t('delivered')} value={stats.delivered} color="border-green-500" />
        <StatCard label={t('cancelled')} value={stats.cancelled} color="border-red-400" />
      </div>
    </div>
  )
}
