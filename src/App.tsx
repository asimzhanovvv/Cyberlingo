import { useEffect } from 'react'
import { Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { AuthGate } from '@/components/auth/AuthGate'
import Roadmap from '@/pages/Roadmap'
import IslandPage from '@/pages/Island'
import LessonPage from '@/pages/Lesson'
import SessionPage from '@/pages/Session'
import ExamBuilder from '@/pages/ExamBuilder'
import Bank from '@/pages/Bank'
import BankSession from '@/pages/BankSession'
import Review from '@/pages/Review'
import Profile from '@/pages/Profile'
import { useProgress } from '@/store/progress'
import { initSync } from '@/store/sync'

export default function App() {
  const theme = useProgress((s) => s.settings.theme)
  useEffect(() => { document.documentElement.dataset.theme = theme }, [theme])
  useEffect(() => { initSync() }, [])

  return (
    <AuthGate>
      <AppShell>
        <Routes>
          <Route path="/" element={<Roadmap />} />
          <Route path="/island/:id" element={<IslandPage />} />
          <Route path="/lesson/:id" element={<LessonPage />} />
          <Route path="/session/:mode/:scope" element={<SessionPage />} />
          <Route path="/terms" element={<ExamBuilder />} />
          <Route path="/exam" element={<Bank />} />
          <Route path="/exam/run/:scope" element={<BankSession />} />
          <Route path="/review" element={<Review />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="*" element={<Roadmap />} />
        </Routes>
      </AppShell>
    </AuthGate>
  )
}
