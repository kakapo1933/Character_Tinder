import { AnimatePresence, motion } from 'framer-motion'

interface CinemaToastProps {
  toast: {
    message: string
    type: 'success' | 'error' | 'info' | 'loading'
  } | null
}

const dotColors = {
  success: 'bg-emerald-400',
  error: 'bg-rose-400',
  info: 'bg-sky-400',
  loading: 'bg-sky-400',
}

export function CinemaToast({ toast }: CinemaToastProps) {
  if (!toast) return null

  return (
    <AnimatePresence>
      <motion.div
        key={toast.message}
        role="status"
        aria-live="polite"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white text-sm shadow-lg"
      >
        {toast.type === 'loading' ? (
          <div className="animate-spin w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full" />
        ) : (
          <div className={`w-2 h-2 rounded-full ${dotColors[toast.type]}`} />
        )}
        <span>{toast.message}</span>
      </motion.div>
    </AnimatePresence>
  )
}
