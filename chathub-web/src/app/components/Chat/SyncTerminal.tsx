import { FC, useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiTerminal, FiSend, FiTrash2, FiX } from 'react-icons/fi'

interface Props {
  isOpen: boolean
  onClose: () => void
  onSend: (text: string) => void
}

const SyncTerminal: FC<Props> = ({ isOpen, onClose, onSend }) => {
  const [text, setText] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Focus textarea when terminal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        textareaRef.current?.focus()
      }, 100)
    }
  }, [isOpen])

  const handleSend = () => {
    if (!text.trim()) return
    onSend(text)
    setText('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 200, opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          className="relative flex flex-col w-full bg-[#18181b] dark:bg-black border-t border-zinc-200 dark:border-zinc-800 text-zinc-100 overflow-hidden font-mono shadow-2xl rounded-t-xl"
        >
          {/* Header */}
          <div className="flex flex-row items-center justify-between px-4 py-2 bg-zinc-100 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 select-none text-xs">
            <div className="flex flex-row items-center gap-2">
              <FiTerminal className="text-emerald-500 w-4 h-4" />
              <span className="font-bold text-zinc-700 dark:text-zinc-300">SYNC INPUT TERMINAL</span>
              <span className="opacity-60 hidden sm:inline">(Broadcasts prompt to all active AIs)</span>
            </div>
            <div className="flex flex-row items-center gap-3">
              <button
                onClick={() => setText('')}
                className="hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors flex items-center gap-1 cursor-pointer"
                title="Clear input"
              >
                <FiTrash2 className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
              <button
                onClick={onClose}
                className="hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors flex items-center cursor-pointer"
                title="Hide terminal (Ctrl+`)"
              >
                <FiX className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex grow relative p-3 bg-white dark:bg-zinc-950">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message here... (Press Ctrl+Enter to Send to all AIs)"
              className="w-full h-full bg-transparent border-0 resize-none outline-none text-sm text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-600 font-sans"
            />

            {/* Bottom Controls */}
            <div className="absolute bottom-3 right-3 flex flex-row items-center gap-2">
              <span className="text-[10px] text-zinc-400 dark:text-zinc-600 select-none hidden xs:inline">
                Ctrl + Enter 发送
              </span>
              <button
                onClick={handleSend}
                disabled={!text.trim()}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  text.trim()
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed'
                }`}
              >
                <FiSend className="w-3.5 h-3.5" />
                <span>Send</span>
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default SyncTerminal
