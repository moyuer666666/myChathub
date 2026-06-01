import { useNavigate } from '@tanstack/react-router'
import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'
import { sample } from 'lodash-es'
import { FC, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { FiTerminal } from 'react-icons/fi'
import { cx } from '~/utils'
import LayoutSwitch from '~app/components/Chat/LayoutSwitch'
import SyncTerminal from '~app/components/Chat/SyncTerminal'
import { Layout } from '~app/consts'
import { useEnabledBots } from '~app/hooks/use-enabled-bots'
import { usePremium } from '~app/hooks/use-premium'
import { showPremiumModalAtom } from '~app/state'
import { getUserConfig } from '~services/user-config'
import { BotId } from '../bots'
import ConversationPanel from '../components/Chat/ConversationPanel'

const layoutAtom = atomWithStorage<Layout>('multiPanelLayout', 2, undefined, { getOnInit: true })
const twoPanelBotsAtom = atomWithStorage<BotId[]>('multiPanelBots:2', ['gemini', 'claude'])
const threePanelBotsAtom = atomWithStorage<BotId[]>('multiPanelBots:3', ['gemini', 'claude', 'chatgpt'])
const fourPanelBotsAtom = atomWithStorage<BotId[]>('multiPanelBots:4', ['gemini', 'claude', 'chatgpt'])
const sixPanelBotsAtom = atomWithStorage<BotId[]>('multiPanelBots:6', ['gemini', 'claude', 'chatgpt'])

const useActiveBots = (bots: string[], count: number) => {
  const chatbots = useEnabledBots()
  const chatbotIds = useMemo(() => chatbots.map((b) => b.id), [chatbots])

  return useMemo(() => {
    if (chatbotIds.length === 0) return []
    let result = bots.filter((id) => chatbotIds.includes(id))
    if (result.length < count) {
      const remaining = chatbotIds.filter((id) => !result.includes(id))
      result = [...result, ...remaining].slice(0, count)
    }
    while (result.length < count && chatbotIds.length > 0) {
      result.push(chatbotIds[0])
    }
    return result
  }, [bots, chatbotIds, count])
}

const GeneralChatPanel: FC<{
  botIds: BotId[]
  setBots?: ReturnType<typeof useSetAtom<typeof twoPanelBotsAtom>>
  supportImageInput?: boolean
}> = ({ botIds, setBots, supportImageInput }) => {
  const [layout, setLayout] = useAtom(layoutAtom)
  const [isTerminalOpen, setIsTerminalOpen] = useState(false)

  const setPremiumModalOpen = useSetAtom(showPremiumModalAtom)
  const premiumState = usePremium()
  const disabled = useMemo(() => !premiumState.isLoading && !premiumState.activated, [premiumState])

  useEffect(() => {
    if (disabled && (botIds.length > 2 || supportImageInput)) {
      setPremiumModalOpen('all-in-one-layout')
    }
  }, [botIds.length, disabled, setPremiumModalOpen, supportImageInput])

  // Toggle terminal via Ctrl + ` shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === '`') {
        e.preventDefault()
        setIsTerminalOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const onSwitchBot = useCallback(
    (botId: BotId, index: number) => {
      if (!setBots) {
        return
      }
      setBots((bots) => {
        const newBots = [...bots]
        newBots[index] = botId
        return newBots
      })
    },
    [setBots],
  )

  const onLayoutChange = useCallback(
    (v: Layout) => {
      setLayout(v)
    },
    [setLayout],
  )

  const handleSend = useCallback((text: string) => {
    if (!text.trim()) return

    const webviews = document.querySelectorAll('webview')
    if (webviews.length === 0) return

    const script = `
      (function(text) {
        function findInput() {
          const selectors = [
            '#prompt-textarea',
            'textarea[placeholder*="message"]',
            'textarea[placeholder*="chat"]',
            'textarea[placeholder*="问"]',
            'textarea[placeholder*="聊"]',
            'textarea[placeholder*="输入"]',
            'textarea[placeholder*="Ask"]',
            'textarea',
            '[contenteditable="true"]',
            '[role="textbox"]',
            'input[type="text"]'
          ];
          for (const selector of selectors) {
            const el = document.querySelector(selector);
            if (el && el.offsetHeight > 0) return el;
          }
          return null;
        }

        const inputEl = findInput();
        if (!inputEl) return false;

        inputEl.focus();

        if (inputEl.tagName === 'TEXTAREA' || inputEl.tagName === 'INPUT') {
          const valueSetter = Object.getOwnPropertyDescriptor(inputEl.constructor.prototype, 'value')?.set;
          if (valueSetter) {
            valueSetter.call(inputEl, text);
          } else {
            inputEl.value = text;
          }
          inputEl.dispatchEvent(new Event('input', { bubbles: true }));
          inputEl.dispatchEvent(new Event('change', { bubbles: true }));
        } else {
          inputEl.innerHTML = '';
          const textNode = document.createTextNode(text);
          inputEl.appendChild(textNode);
          inputEl.dispatchEvent(new Event('input', { bubbles: true }));
          inputEl.dispatchEvent(new Event('change', { bubbles: true }));
        }

        setTimeout(() => {
          let sendBtn = null;
          const btnSelectors = [
            'button[data-testid="send-button"]',
            'button[aria-label*="Send"]',
            'button[aria-label*="发送"]',
            'button[aria-label*="submit"]',
            'button[type="submit"]',
            'button.send-button',
            '[class*="send"] button',
            'button[class*="send"]'
          ];

          for (const sel of btnSelectors) {
            const btn = document.querySelector(sel);
            if (btn && !btn.disabled && btn.offsetHeight > 0) {
              sendBtn = btn;
              break;
            }
          }

          if (!sendBtn) {
            const container = inputEl.closest('form') || inputEl.parentElement?.parentElement;
            if (container) {
              const buttons = Array.from(container.querySelectorAll('button'));
              sendBtn = buttons.find(b => {
                const rect = b.getBoundingClientRect();
                return rect.width > 0 && rect.height > 0 && !b.disabled && (
                  b.querySelector('svg') || 
                  b.innerHTML.includes('send') || 
                  b.innerHTML.includes('发送') ||
                  b.getAttribute('type') === 'submit'
                );
              }) || buttons[buttons.length - 1];
            }
          }

          if (sendBtn && !sendBtn.disabled) {
            sendBtn.click();
          } else {
            const enterDown = new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true });
            inputEl.dispatchEvent(enterDown);
          }
        }, 150);

        return true;
      })(${JSON.stringify(text)});
    `

    webviews.forEach((webview: any) => {
      try {
        webview.executeJavaScript(script)
      } catch (err) {
        console.error('Failed to execute broadcast in webview:', err)
      }
    })
  }, [])

  return (
    <div className="flex flex-col overflow-hidden h-full">
      <div
        className={cx(
          'grid overflow-hidden grow auto-rows-fr',
          botIds.length % 3 === 0 ? 'grid-cols-3' : 'grid-cols-2',
          botIds.length > 3 ? 'gap-2' : 'gap-3',
        )}
      >
        {botIds.map((botId, index) => (
          <ConversationPanel
            key={`${botId}-${index}`}
            botId={botId}
            mode="compact"
            onSwitchBot={setBots ? (newBotId) => onSwitchBot(newBotId, index) : undefined}
          />
        ))}
      </div>
      <div className="flex flex-row items-center justify-between gap-3 mt-3 px-1">
        <LayoutSwitch layout={layout} onChange={onLayoutChange} />
        <button
          onClick={() => setIsTerminalOpen((prev) => !prev)}
          className={cx(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm transition-all border font-medium select-none cursor-pointer',
            isTerminalOpen
              ? 'bg-emerald-600 border-emerald-600 text-white shadow-md'
              : 'bg-primary-background border-primary-border text-primary-text hover:bg-[#0000000a] dark:hover:bg-[#ffffff0a]',
          )}
        >
          <FiTerminal className="w-4 h-4" />
          <span>{isTerminalOpen ? '隐藏终端' : '同步终端'}</span>
        </button>
      </div>
      <SyncTerminal isOpen={isTerminalOpen} onClose={() => setIsTerminalOpen(false)} onSend={handleSend} />
    </div>
  )
}

const TwoBotChatPanel = () => {
  const [bots, setBots] = useAtom(twoPanelBotsAtom)
  const activeBots = useActiveBots(bots, 2)
  return <GeneralChatPanel botIds={activeBots} setBots={setBots} />
}

const ThreeBotChatPanel = () => {
  const [bots, setBots] = useAtom(threePanelBotsAtom)
  const activeBots = useActiveBots(bots, 3)
  return <GeneralChatPanel botIds={activeBots} setBots={setBots} />
}

const FourBotChatPanel = () => {
  const [bots, setBots] = useAtom(fourPanelBotsAtom)
  const activeBots = useActiveBots(bots, 4)
  return <GeneralChatPanel botIds={activeBots} setBots={setBots} />
}

const SixBotChatPanel = () => {
  const [bots, setBots] = useAtom(sixPanelBotsAtom)
  const activeBots = useActiveBots(bots, 6)
  return <GeneralChatPanel botIds={activeBots} setBots={setBots} />
}

const ImageInputPanel = () => {
  const chatbots = useEnabledBots()
  const chatbotIds = useMemo(() => chatbots.map((b) => b.id), [chatbots])
  const activeBots = useMemo(() => chatbotIds.slice(0, 3), [chatbotIds])
  return <GeneralChatPanel botIds={activeBots} supportImageInput={true} />
}

const MultiBotChatPanel: FC = () => {
  const layout = useAtomValue(layoutAtom)
  if (layout === 'sixGrid') {
    return <SixBotChatPanel />
  }
  if (layout === 4) {
    return <FourBotChatPanel />
  }
  if (layout === 3) {
    return <ThreeBotChatPanel />
  }
  if (layout === 'imageInput') {
    return <ImageInputPanel />
  }
  return <TwoBotChatPanel />
}

let hasRedirectedOnStartup = false

const MultiBotChatPanelPage: FC = () => {
  const navigate = useNavigate()
  useEffect(() => {
    if (!hasRedirectedOnStartup) {
      hasRedirectedOnStartup = true
      getUserConfig().then((config) => {
        if (config.startupPage && config.startupPage !== 'all' && config.chatbots.some((b) => b.id === config.startupPage)) {
          navigate({
            to: '/chat/$botId',
            params: { botId: config.startupPage },
            replace: true,
          })
        }
      })
    }
  }, [navigate])

  return (
    <Suspense>
      <MultiBotChatPanel />
    </Suspense>
  )
}

export default MultiBotChatPanelPage
