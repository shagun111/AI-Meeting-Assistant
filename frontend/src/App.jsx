
import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { Toaster, toast } from 'react-hot-toast'
import {
  AudioLines,
  BrainCircuit,
  Check,
  ChevronRight,
  CircleHelp,
  FileAudio,
  FileText,
  LayoutDashboard,
  LoaderCircle,
  Mail,
  Plus,
  Settings2,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  X,
  Copy,
  Download,
  Zap,
} from 'lucide-react'

const API_URL = 'http://127.0.0.1:8000'
const MAX_FILE_SIZE = 100 * 1024 * 1024
const ACCEPTED_EXTENSIONS = [
  '.mp3', '.wav', '.m4a', '.mp4', '.webm', '.mpeg',
  '.mpga', '.ogg', '.flac', '.mov', '.avi'
]

function cleanMarkdown(text = '') {
  return String(text).replace(/\\([*_`~])/g, '$1').trim()
}

function App() {
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState(null)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('summary')

  const tabs = [
    { id: 'summary', label: 'Summary & Actions', icon: BrainCircuit },
    { id: 'transcript', label: 'Transcript', icon: FileText },
    { id: 'email', label: 'Follow-up Email', icon: Mail },
  ]

  const activeContent = results
    ? {
        summary: results.meeting_report,
        transcript: results.transcript,
        email: results.follow_up_email,
      }[activeTab]
    : ''

  const activeTitle = {
    summary: 'Meeting Summary & Action Items',
    transcript: 'Meeting Transcript',
    email: 'Follow-up Email Draft',
  }[activeTab]

  function handleFileChange(event) {
    const selected = event.target.files?.[0] || null
    setError('')
    setResults(null)

    if (!selected) {
      setFile(null)
      return
    }

    const ext = `.${selected.name.split('.').pop()}`.toLowerCase()

    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      setFile(null)
      setError('Unsupported file type. Choose a supported audio or video file.')
      event.target.value = ''
      return
    }

    if (selected.size > MAX_FILE_SIZE) {
      setFile(null)
      setError('The selected file exceeds the 100 MB limit.')
      event.target.value = ''
      return
    }

    setFile(selected)
  }

  async function processMeeting() {
    if (!file) {
      setError('Please select a recording first.')
      return
    }

    setLoading(true)
    setError('')
    setResults(null)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch(`${API_URL}/process-meeting`, {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          typeof data.detail === 'string'
            ? data.detail
            : 'Meeting processing failed. Please try again.'
        )
      }

      setResults({
        ...data,
        transcript: cleanMarkdown(data.transcript),
        meeting_report: cleanMarkdown(data.meeting_report),
        follow_up_email: cleanMarkdown(data.follow_up_email),
      })

      setActiveTab('summary')
      toast.success('Your meeting insights are ready!')
    } catch (err) {
      const message = err.message === 'Failed to fetch'
        ? 'Cannot connect to the backend. Make sure FastAPI is running.'
        : err.message || 'Something went wrong.'

      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  async function copyText() {
    if (!activeContent) {
      toast.error('There is no text to copy.')
      return
    }

    try {
      await navigator.clipboard.writeText(activeContent)
      toast.success('Copied to clipboard!')
    } catch {
      toast.error('Clipboard access failed. Check browser permissions.')
    }
  }

  function downloadReport() {
    if (!results?.meeting_id) {
      toast.error('No report is available yet.')
      return
    }

    const link = document.createElement('a')
    link.href = `${API_URL}/reports/${results.meeting_id}`
    link.download = `meeting_report_${results.meeting_id.slice(0, 8)}.txt`
    document.body.appendChild(link)
    link.click()
    link.remove()
  }

  function removeFile() {
    setFile(null)
    setResults(null)
    setError('')
  }

  return (
    <div className="min-h-screen bg-[#080b14] text-slate-100">
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#171c2b',
            color: '#f8fafc',
            border: '1px solid #30374b',
          },
        }}
      />

      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="hidden w-64 shrink-0 flex-col border-r border-white/[0.07] bg-[#0b0f1a] p-5 lg:flex">
          <div className="flex items-center gap-3 px-2 py-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/20">
              <AudioLines size={23} />
            </div>
            <div>
              <h1 className="font-bold tracking-tight">MeetMind AI</h1>
              <p className="text-xs text-slate-500">Meeting workspace</p>
            </div>
          </div>

          <div className="mt-10">
            <p className="px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
              Workspace
            </p>

            <div className="mt-3 flex items-center gap-3 rounded-xl border border-indigo-400/15 bg-indigo-500/10 px-3 py-3 text-sm font-medium text-indigo-300">
              <LayoutDashboard size={18} />
              Overview
              <ChevronRight className="ml-auto" size={16} />
            </div>

            <button
              onClick={() => document.getElementById('upload-panel')?.scrollIntoView({ behavior: 'smooth' })}
              className="mt-2 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-slate-400 transition hover:bg-white/5 hover:text-white"
            >
              <FileAudio size={18} />
              New meeting
              <Plus className="ml-auto" size={16} />
            </button>
          </div>

          <div className="mt-10 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Zap size={16} className="text-amber-300" />
              AI-powered notes
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              Turn long conversations into clear summaries, transcripts and follow-up emails.
            </p>
            <div className="mt-4 flex items-center gap-2 text-xs text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Ready to process
            </div>
          </div>

          <div className="mt-auto border-t border-white/[0.07] pt-5">
            <div className="flex items-center gap-3 rounded-xl px-2 py-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800">
                <Settings2 size={17} className="text-slate-300" />
              </div>
              <div>
                <p className="text-sm font-medium">Your workspace</p>
                <p className="text-xs text-slate-500">Personal account</p>
              </div>
              <CircleHelp className="ml-auto text-slate-500" size={17} />
            </div>
          </div>
        </aside>

        {/* Main workspace */}
        <main className="min-w-0 flex-1">
          <header className="sticky top-0 z-10 flex items-center justify-between border-b border-white/[0.07] bg-[#080b14]/90 px-5 py-4 backdrop-blur-xl sm:px-8 lg:px-10">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-300 lg:hidden">
                <AudioLines size={20} />
              </div>
              <div>
                <p className="text-sm font-semibold">AI Meeting Assistant</p>
                <p className="text-xs text-slate-500">Workspace / Overview</p>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-full border border-emerald-400/15 bg-emerald-400/[0.06] px-3 py-2 text-xs font-medium text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              System ready
            </div>
          </header>

          <div className="mx-auto max-w-6xl space-y-8 px-5 py-8 sm:px-8 sm:py-10 lg:px-10">
            {/* Hero */}
            <section className="relative overflow-hidden rounded-3xl border border-indigo-400/15 bg-gradient-to-br from-[#171a35] via-[#111629] to-[#10131d] p-6 sm:p-9 lg:p-11">
              <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-indigo-500/15 blur-3xl" />
              <div className="pointer-events-none absolute bottom-0 right-1/4 h-40 w-40 rounded-full bg-violet-500/10 blur-3xl" />

              <div className="relative max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-indigo-300/20 bg-indigo-300/[0.07] px-3 py-1.5 text-xs font-medium text-indigo-200">
                  <Sparkles size={14} />
                  Your AI-powered workspace
                </div>

                <h2 className="mt-6 text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
                  Every meeting.
                  <span className="block bg-gradient-to-r from-indigo-300 via-violet-300 to-cyan-300 bg-clip-text text-transparent">
                    More meaningful.
                  </span>
                </h2>

                <p className="mt-4 max-w-xl text-sm leading-7 text-slate-400 sm:text-base">
                  Transform recordings into clear transcripts, actionable insights and polished follow-up emails—all in one place.
                </p>

                <div className="mt-6 flex flex-wrap gap-4 text-xs text-slate-400">
                  <span className="flex items-center gap-2">
                    <Check size={15} className="text-emerald-400" />
                    Automatic transcription
                  </span>
                  <span className="flex items-center gap-2">
                    <Check size={15} className="text-emerald-400" />
                    AI meeting summaries
                  </span>
                  <span className="flex items-center gap-2">
                    <Check size={15} className="text-emerald-400" />
                    Follow-up drafts
                  </span>
                </div>
              </div>

              <div className="pointer-events-none absolute bottom-8 right-8 hidden h-32 w-32 items-center justify-center rounded-3xl border border-white/10 bg-white/[0.03] lg:flex">
                <BrainCircuit size={66} strokeWidth={1} className="text-indigo-300/70" />
              </div>
            </section>

            {/* Upload */}
            <section id="upload-panel" className="rounded-3xl border border-white/[0.08] bg-[#101522] p-5 shadow-2xl shadow-black/10 sm:p-7">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-300">
                    <UploadCloud size={24} />
                  </div>
                  <div>
                    <h3 className="font-semibold">Create meeting insights</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Upload a recording to get started
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start rounded-full border border-white/[0.07] px-3 py-2 text-xs text-slate-400 sm:self-auto">
                  <ShieldCheck size={15} className="text-emerald-400" />
                  Files up to 100 MB
                </div>
              </div>

              <label className={`mt-6 flex min-h-52 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed px-5 py-8 text-center transition duration-200 ${
                file
                  ? 'border-indigo-400/40 bg-indigo-500/[0.06]'
                  : 'border-slate-700 bg-[#0b0f19] hover:border-indigo-400/50 hover:bg-indigo-500/[0.03]'
              }`}>
                <input
                  type="file"
                  accept={ACCEPTED_EXTENSIONS.join(',')}
                  className="hidden"
                  disabled={loading}
                  onChange={handleFileChange}
                />

                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-indigo-400/20 bg-indigo-500/10 text-indigo-300">
                  {file ? <FileAudio size={27} /> : <UploadCloud size={27} />}
                </div>

                <p className="mt-4 max-w-full break-all text-sm font-semibold">
                  {file ? file.name : 'Drop your recording here or browse'}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  MP3, WAV, M4A, MP4, WEBM and more
                </p>

                {file && (
                  <span className="mt-3 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </span>
                )}
              </label>

              {error && (
                <div role="alert" className="mt-4 flex items-start gap-3 rounded-xl border border-rose-400/20 bg-rose-400/[0.06] p-4 text-sm text-rose-300">
                  <X size={18} className="mt-0.5 shrink-0" />
                  {error}
                </div>
              )}

              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={processMeeting}
                  disabled={loading || !file}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/15 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {loading
                    ? <><LoaderCircle size={18} className="animate-spin" /> Processing recording…</>
                    : <><Sparkles size={17} /> Generate meeting insights <ChevronRight size={17} /></>
                  }
                </button>

                {file && !loading && (
                  <button
                    type="button"
                    onClick={removeFile}
                    className="rounded-xl border border-white/10 px-5 py-3 text-sm text-slate-400 transition hover:bg-white/5 hover:text-white"
                  >
                    Remove file
                  </button>
                )}
              </div>

              {loading && (
                <div role="status" aria-live="polite" className="mt-5 rounded-xl border border-indigo-400/15 bg-indigo-500/[0.05] p-4">
                  <div className="flex items-center gap-3 text-sm font-medium text-indigo-200">
                    <LoaderCircle size={18} className="animate-spin" />
                    Turning your conversation into insights
                  </div>
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    Whisper is transcribing your recording and the AI is preparing your meeting notes. Longer recordings may take several minutes.
                  </p>
                </div>
              )}
            </section>

            {/* Results */}
            {results && (
              <section className="space-y-5" aria-live="polite">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                  <div>
                    <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-400">
                      <Check size={15} />
                      Processing complete
                    </p>
                    <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                      Your meeting report
                    </h2>
                    <p className="mt-2 text-sm text-slate-500">
                      Your conversation, organized and ready to review.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={downloadReport}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-medium transition hover:border-indigo-400/40 hover:bg-white/[0.06]"
                  >
                    <Download size={17} />
                    Download report
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {[
                    { icon: BrainCircuit, title: 'AI Summary', text: 'Key points and decisions', color: 'text-indigo-300 bg-indigo-400/10' },
                    { icon: AudioLines, title: 'Transcript', text: 'Your recorded conversation', color: 'text-cyan-300 bg-cyan-400/10' },
                    { icon: Mail, title: 'Follow-up Email', text: 'Ready-to-edit email draft', color: 'text-violet-300 bg-violet-400/10' },
                  ].map((item, index) => (
                    <button
                      key={item.title}
                      type="button"
                      onClick={() => setActiveTab(['summary', 'transcript', 'email'][index])}
                      className={`rounded-2xl border p-4 text-left transition ${
                        activeTab === ['summary', 'transcript', 'email'][index]
                          ? 'border-indigo-400/30 bg-indigo-500/[0.06]'
                          : 'border-white/[0.07] bg-[#101522] hover:border-white/15'
                      }`}
                    >
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${item.color}`}>
                        <item.icon size={20} />
                      </div>
                      <p className="mt-4 text-sm font-semibold">{item.title}</p>
                      <p className="mt-1 text-xs text-slate-500">{item.text}</p>
                    </button>
                  ))}
                </div>

                <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#101522]">
                  <div className="flex flex-col justify-between gap-3 border-b border-white/[0.07] p-4 sm:flex-row sm:items-center sm:px-6">
                    <div>
                      <h3 className="font-semibold">{activeTitle}</h3>
                      <p className="mt-1 text-xs text-slate-500">
                        AI-generated content · Review before sharing
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={copyText}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-slate-300 transition hover:bg-white/5"
                    >
                      <Copy size={14} />
                      Copy text
                    </button>
                  </div>

                  <div className="flex gap-1 overflow-x-auto border-b border-white/[0.06] px-3 pt-3">
                    {tabs.map((tab) => {
                      const Icon = tab.icon
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setActiveTab(tab.id)}
                          className={`flex shrink-0 items-center gap-2 rounded-t-lg border-b-2 px-4 py-3 text-xs font-medium transition ${
                            activeTab === tab.id
                              ? 'border-indigo-400 bg-indigo-500/[0.07] text-indigo-200'
                              : 'border-transparent text-slate-500 hover:text-slate-200'
                          }`}
                        >
                          <Icon size={15} />
                          {tab.label}
                        </button>
                      )
                    })}
                  </div>

                  <article className="min-h-56 p-5 sm:p-7">
                    {activeContent ? (
                      <div className="markdown-content break-words text-sm leading-7 text-slate-300 sm:text-[15px]">
                        <ReactMarkdown
                          components={{
                            h1: ({ children }) => <h1 className="mb-4 mt-6 text-2xl font-bold text-white">{children}</h1>,
                            h2: ({ children }) => <h2 className="mb-3 mt-6 text-xl font-bold text-white">{children}</h2>,
                            h3: ({ children }) => <h3 className="mb-2 mt-5 text-base font-semibold text-indigo-200">{children}</h3>,
                            p: ({ children }) => <p className="mb-4 last:mb-0">{children}</p>,
                            ul: ({ children }) => <ul className="mb-4 list-disc space-y-2 pl-6 marker:text-indigo-400">{children}</ul>,
                            ol: ({ children }) => <ol className="mb-4 list-decimal space-y-2 pl-6 marker:text-indigo-300">{children}</ol>,
                            li: ({ children }) => <li className="pl-1">{children}</li>,
                            strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
                            blockquote: ({ children }) => <blockquote className="my-4 border-l-2 border-indigo-400 pl-4 text-slate-400">{children}</blockquote>,
                            hr: () => <hr className="my-6 border-white/10" />,
                          }}
                        >
                          {activeContent}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500">No content was returned for this section.</p>
                    )}
                  </article>
                </div>

                <p className="flex items-start gap-2 text-xs leading-5 text-slate-500">
                  <ShieldCheck size={15} className="mt-0.5 shrink-0" />
                  AI-generated notes may need review. Verify names, deadlines, decisions and action items before sharing.
                </p>
              </section>
            )}

            <footer className="flex flex-col gap-3 border-t border-white/[0.07] pt-6 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between">
              <p className="flex items-center gap-2">
                <AudioLines size={15} />
                MeetMind AI · Whisper + Groq
              </p>
              <p className="flex items-center gap-2">
                <ShieldCheck size={14} />
                Review AI-generated notes before sharing
              </p>
            </footer>
          </div>
        </main>
      </div>
    </div>
  )
}

export default App