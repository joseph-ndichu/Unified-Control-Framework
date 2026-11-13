import { useEffect, useState } from 'react'
import { Route, Routes } from 'react-router-dom'
import { api } from './api'
import Layout from './Layout'
import Login from './Login'
import ControlPage from './pages/ControlPage'
import Controls from './pages/Controls'
import Framework from './pages/Framework'
import Gaps from './pages/Gaps'
import Home from './pages/Home'
import Requirement from './pages/Requirement'
import SearchPage from './pages/SearchPage'
import { Crumbs, PageTitle } from './ui'

function NotFound() {
  return (
    <>
      <Crumbs trail={[{ label: 'Page not found' }]} />
      <PageTitle title="Page not found">This address does not match any page. Use the menu on the left to continue.</PageTitle>
    </>
  )
}

export default function App() {
  const [user, setUser] = useState(undefined) // undefined while the session is being checked

  useEffect(() => {
    api('/auth/session/').then((d) => setUser(d.user)).catch(() => setUser(null))
  }, [])

  if (user === undefined) return <p className="p-8 text-sm text-stone-500">Loading…</p>
  if (!user) return <Login onSignedIn={setUser} />

  const signOut = () => api('/auth/logout/', { method: 'POST' }).then(() => setUser(null))
  const isAdmin = user.role === 'admin'

  return (
    <Layout user={user} onSignOut={signOut}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/controls" element={<Controls />} />
        <Route path="/controls/:id" element={<ControlPage isAdmin={isAdmin} />} />
        <Route path="/frameworks/:id" element={<Framework />} />
        <Route path="/requirements/:id" element={<Requirement />} />
        <Route path="/gaps" element={<Gaps />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  )
}
