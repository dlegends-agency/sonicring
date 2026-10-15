import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { PageMeta } from './components/PageMeta'
import { TrackingPixels } from './components/TrackingPixels'
import { HomePage } from './pages/HomePage'
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage'
import { ReportAuditPage } from './pages/ReportAuditPage'
import { TermsPage } from './pages/TermsPage'
import './App.css'

// Code-split everything outside the public marketing funnel (admin, checkout,
// onboarding, mission control) so the homepage bundle stays small — these
// pages aren't part of the pages Google/crawlers need fast, and aren't
// prerendered.
const AdminLayout = lazy(() =>
  import('./admin/AdminLayout').then((m) => ({ default: m.AdminLayout })),
)
const AutomationEditorPage = lazy(() =>
  import('./admin/AutomationEditorPage').then((m) => ({
    default: m.AutomationEditorPage,
  })),
)
const AutomationsPage = lazy(() =>
  import('./admin/AutomationsPage').then((m) => ({ default: m.AutomationsPage })),
)
const ContactDetailPage = lazy(() =>
  import('./admin/ContactDetailPage').then((m) => ({
    default: m.ContactDetailPage,
  })),
)
const ContactsPage = lazy(() =>
  import('./admin/ContactsPage').then((m) => ({ default: m.ContactsPage })),
)
const DashboardPage = lazy(() =>
  import('./admin/DashboardPage').then((m) => ({ default: m.DashboardPage })),
)
const EmailTestPage = lazy(() =>
  import('./admin/EmailTestPage').then((m) => ({ default: m.EmailTestPage })),
)
const ListsPage = lazy(() =>
  import('./admin/ListsPage').then((m) => ({ default: m.ListsPage })),
)
const SettingsPage = lazy(() =>
  import('./admin/SettingsPage').then((m) => ({ default: m.SettingsPage })),
)
const TagsPage = lazy(() =>
  import('./admin/TagsPage').then((m) => ({ default: m.TagsPage })),
)
const CheckoutPage = lazy(() =>
  import('./pages/CheckoutPage').then((m) => ({ default: m.CheckoutPage })),
)
const CheckoutSuccessPage = lazy(() =>
  import('./pages/CheckoutPage').then((m) => ({ default: m.CheckoutSuccessPage })),
)
const CheckoutCancelPage = lazy(() =>
  import('./pages/CheckoutPage').then((m) => ({ default: m.CheckoutCancelPage })),
)
const OnboardingPage = lazy(() =>
  import('./pages/OnboardingPage').then((m) => ({ default: m.OnboardingPage })),
)
const MissionControlPage = lazy(() =>
  import('./pages/MissionControlPage').then((m) => ({
    default: m.MissionControlPage,
  })),
)

function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return null
}

function StaticHomeRedirect() {
  useEffect(() => {
    window.location.replace('/' + window.location.search + window.location.hash)
  }, [])
  return null
}

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <PageMeta />
      <TrackingPixels />
      <Suspense fallback={null}>
        <Routes>
          {/* "/" is the static 3D office page (public/index.html). If the app
              navigates there client-side, reload so the server serves it. */}
          <Route path="/" element={<StaticHomeRedirect />} />
          <Route
            path="/funnel"
            element={
              <div className="page">
                <HomePage />
              </div>
            }
          />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/checkout/success" element={<CheckoutSuccessPage />} />
          <Route path="/checkout/cancel" element={<CheckoutCancelPage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/mission-control" element={<MissionControlPage />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="contacts" element={<ContactsPage />} />
            <Route path="contacts/:id" element={<ContactDetailPage />} />
            <Route path="lists" element={<ListsPage />} />
            <Route path="tags" element={<TagsPage />} />
            <Route path="automations" element={<AutomationsPage />} />
            <Route path="automations/:id" element={<AutomationEditorPage />} />
            <Route path="email-test" element={<EmailTestPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
          <Route
            path="/privacy-policy"
            element={
              <div className="page">
                <PrivacyPolicyPage />
              </div>
            }
          />
          <Route
            path="/terms-and-conditions"
            element={
              <div className="page">
                <TermsPage />
              </div>
            }
          />
          <Route path="/report-audit" element={<ReportAuditPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App
