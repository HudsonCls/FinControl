import { useState, useRef, useEffect, type FormEvent } from 'react';
import { Send, MessageCircle, Check } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { useChatHistory, useSendChat } from '@/lib/queries';
import { formatTime } from '@/lib/format';
import type { ChatMessage } from '@/lib/types';

const SUGGESTIONS = [
  'Gastei 42,90 no iFood',
  'Quanto gastei em alimentação?',
  'Recebi 4800 de salário',
  'Limite de 500 em lazer',
];

function Bubble({ msg }: { msg: Pick<ChatMessage, 'role' | 'content' | 'createdAt'> }) {
  const mine = msg.role === 'USER';
  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
          mine
            ? 'rounded-br-sm bg-brand-100 text-emerald-900 dark:bg-brand/20 dark:text-emerald-100'
            : 'rounded-bl-sm border border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
        }`}
      >
        <div className="whitespace-pre-wrap">{msg.content}</div>
        <div className="mt-1 text-right text-[10px] text-slate-400 dark:text-slate-500">
          {formatTime(msg.createdAt)}
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  const history = useChatHistory();
  const send = useSendChat();
  const [text, setText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const messages = history.data ?? [];

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length, send.isPending]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const content = text.trim();
    if (!content || send.isPending) return;
    setText('');
    try {
      await send.mutateAsync(content);
    } catch {
      setText(content);
    }
  }

  function quick(s: string) {
    if (send.isPending) return;
    send.mutate(s);
  }

  return (
    <Layout title="Chat WhatsApp">
      <div className="mx-auto flex h-full max-w-2xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-white">
            <MessageCircle size={18} />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              FinControl IA
            </div>
            <div className="text-[11px] text-brand">online · responde na hora</div>
          </div>
        </div>

        <div
          ref={scrollRef}
          className="flex-1 space-y-2 overflow-y-auto bg-brand-50 p-4 dark:bg-slate-950"
        >
          {messages.length === 0 && !send.isPending && (
            <Bubble
              msg={{
                role: 'ASSISTANT',
                content:
                  'Oi! Me diga um gasto ("gastei 42,90 no iFood"), pergunte "quanto gastei em alimentação?" ou defina um limite ("limite de 500 em lazer").',
                createdAt: new Date().toISOString(),
              }}
            />
          )}

          {messages.map((m) => (
            <Bubble key={m.id} msg={m} />
          ))}

          {send.isPending && (
            <>
              <Bubble
                msg={{ role: 'USER', content: send.variables as string, createdAt: new Date().toISOString() }}
              />
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-3.5 py-2.5 dark:border-slate-700 dark:bg-slate-800">
                  <div className="flex gap-1">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-300 [animation-delay:-0.3s] dark:bg-slate-600" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-300 [animation-delay:-0.15s] dark:bg-slate-600" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-300 dark:bg-slate-600" />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="border-t border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-2 flex flex-wrap gap-1.5">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => quick(s)}
                className="flex items-center gap-1 rounded-full border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:border-brand hover:bg-brand-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-brand/10"
              >
                <Check size={11} className="text-brand" /> {s}
              </button>
            ))}
          </div>
          <form onSubmit={submit} className="flex items-center gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Digite um gasto ou pergunta..."
              className="flex-1 rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-brand focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:bg-slate-800"
            />
            <button
              type="submit"
              disabled={send.isPending || !text.trim()}
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-brand text-white hover:bg-brand-dark disabled:opacity-50"
              aria-label="Enviar"
            >
              <Send size={17} />
            </button>
          </form>
        </div>
      </div>
    </Layout>
  );
}
