import { useNavigate } from 'react-router-dom'

export default function PrivacyPolicyPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-3xl mx-auto px-md py-xl">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-xs text-label-sm text-on-surface-variant hover:text-primary transition-colors mb-xl"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Back
        </button>

        <h1 className="text-page-title font-bold text-primary mb-sm">Privacy Policy</h1>
        <p className="text-meta text-on-surface-variant mb-xl">Last updated: May 2025</p>

        <div className="flex flex-col gap-lg text-body-md text-on-surface leading-relaxed">

          <section>
            <h2 className="text-headline-md font-bold text-on-surface mb-sm">1. Overview</h2>
            <p>HireLite ("we", "our", or "us") is an AI-powered recruitment platform that helps recruiters match candidates to job postings. This Privacy Policy explains how we collect, use, and protect information when you use our service.</p>
          </section>

          <section>
            <h2 className="text-headline-md font-bold text-on-surface mb-sm">2. Information We Collect</h2>
            <p className="mb-sm"><strong>Recruiters:</strong> When you sign in with Google, we receive your name, email address, and profile picture from your Google account. We store your email to identify your account and associate job postings with you.</p>
            <p><strong>Candidates:</strong> Candidates may upload a resume (PDF or DOCX). We extract text from the resume to generate a searchable profile. We do not require candidates to create an account or provide any login credentials.</p>
          </section>

          <section>
            <h2 className="text-headline-md font-bold text-on-surface mb-sm">3. How We Use Your Information</h2>
            <ul className="list-disc pl-lg flex flex-col gap-xs">
              <li>To authenticate recruiter accounts via Google OAuth</li>
              <li>To match candidate resumes to job postings using AI-powered analysis</li>
              <li>To display ranked candidate results to authorised recruiters</li>
              <li>To schedule and manage interviews between recruiters and candidates</li>
            </ul>
          </section>

          <section>
            <h2 className="text-headline-md font-bold text-on-surface mb-sm">4. Google OAuth Scopes</h2>
            <p>We request the following Google account permissions:</p>
            <ul className="list-disc pl-lg mt-sm flex flex-col gap-xs">
              <li><strong>email</strong> — to identify your account</li>
              <li><strong>profile</strong> — to display your name and photo in the app</li>
              <li><strong>Google Calendar</strong> — only used to create interview events when you explicitly schedule a meeting</li>
            </ul>
            <p className="mt-sm">We do not read your existing calendar events, emails, or any other Google account data.</p>
          </section>

          <section>
            <h2 className="text-headline-md font-bold text-on-surface mb-sm">5. Data Storage</h2>
            <p>Data is stored in a secured Supabase database. Resume files are stored in Supabase Storage. We do not sell, rent, or share your personal data with third parties.</p>
          </section>

          <section>
            <h2 className="text-headline-md font-bold text-on-surface mb-sm">6. Data Retention</h2>
            <p>Recruiter accounts and associated postings are retained while the account is active. Candidate profiles may be deleted upon request. Resume files can be removed by contacting us.</p>
          </section>

          <section>
            <h2 className="text-headline-md font-bold text-on-surface mb-sm">7. Your Rights</h2>
            <p>You may request access to, correction of, or deletion of your personal data at any time by contacting us at the email below. Recruiters can sign out and revoke Google OAuth access at any time via their Google account settings.</p>
          </section>

          <section>
            <h2 className="text-headline-md font-bold text-on-surface mb-sm">8. Cookies</h2>
            <p>We use only essential session cookies required for authentication. We do not use tracking or advertising cookies.</p>
          </section>

          <section>
            <h2 className="text-headline-md font-bold text-on-surface mb-sm">9. Contact</h2>
            <p>If you have questions about this policy, please contact: <strong>josh.255091@gmail.com</strong></p>
          </section>

        </div>

        <div className="mt-xl pt-lg border-t border-outline-variant text-meta text-on-surface-variant text-center">
          HireLite · AI-powered recruiting
        </div>
      </div>
    </div>
  )
}
