import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { DollarSign, ArrowLeft } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';

const CONTACT_EMAIL = 'hudsoncalasansbsb@gmail.com';
const LAST_UPDATE = 'julho de 2026';

function LegalLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-white">
            <DollarSign size={16} />
          </div>
          <span className="flex-1 text-sm font-semibold text-slate-800 dark:text-slate-100">
            FinControl
          </span>
          <ThemeToggle />
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-8">
        <Link
          to="/login"
          className="mb-4 inline-flex items-center gap-1 text-xs text-brand hover:underline"
        >
          <ArrowLeft size={13} /> Voltar
        </Link>
        <h1 className="mb-1 text-xl font-semibold text-slate-800 dark:text-slate-100">{title}</h1>
        <p className="mb-6 text-xs text-slate-400 dark:text-slate-500">
          Última atualização: {LAST_UPDATE}
        </p>
        <div className="space-y-5 text-sm leading-relaxed text-slate-600 dark:text-slate-300 [&_h2]:mb-1.5 [&_h2]:mt-2 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-slate-800 dark:[&_h2]:text-slate-100 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
          {children}
        </div>
      </main>
    </div>
  );
}

export function TermsPage() {
  return (
    <LegalLayout title="Termos de Uso">
      <section>
        <h2>1. O que é o FinControl</h2>
        <p>
          O FinControl é uma ferramenta de organização financeira pessoal: você registra
          receitas e despesas (pelo aplicativo ou por mensagens de WhatsApp), define
          orçamentos por categoria e acompanha relatórios dos seus próprios dados.
        </p>
      </section>
      <section>
        <h2>2. O que o FinControl NÃO é</h2>
        <p>
          O FinControl <strong>não é uma instituição financeira</strong>, não movimenta
          dinheiro, não se conecta a contas bancárias, não realiza pagamentos e não
          oferece aconselhamento financeiro, contábil ou de investimentos. Todo conteúdo
          exibido (totais, alertas, resumos e categorização automática) tem caráter
          exclusivamente informativo e organizacional, baseado nos dados que você mesmo
          registra, e pode conter erros — confira antes de tomar decisões financeiras.
        </p>
      </section>
      <section>
        <h2>3. Sua conta e responsabilidades</h2>
        <ul>
          <li>Você é responsável por manter sua senha em sigilo.</li>
          <li>Você é responsável pela veracidade dos dados que registra.</li>
          <li>
            O uso do canal de WhatsApp depende de você vincular seu próprio número no
            perfil; mensagens enviadas de números não vinculados não são associadas a
            nenhuma conta.
          </li>
          <li>É proibido usar o serviço para fins ilícitos ou para violar direitos de terceiros.</li>
        </ul>
      </section>
      <section>
        <h2>4. Disponibilidade</h2>
        <p>
          O serviço é fornecido "como está", sem garantia de disponibilidade contínua.
          Podemos alterar, suspender ou descontinuar funcionalidades a qualquer momento.
          Recomendamos exportar seus dados (CSV) periodicamente.
        </p>
      </section>
      <section>
        <h2>5. Encerramento</h2>
        <p>
          Você pode excluir sua conta a qualquer momento em Perfil → Zona de perigo. A
          exclusão apaga permanentemente todos os seus dados (transações, categorias,
          orçamentos, histórico de chat) e não pode ser desfeita.
        </p>
      </section>
      <section>
        <h2>6. Contato</h2>
        <p>
          Dúvidas sobre estes termos: <a href={`mailto:${CONTACT_EMAIL}`} className="text-brand underline">{CONTACT_EMAIL}</a>.
        </p>
      </section>
    </LegalLayout>
  );
}

export function PrivacyPage() {
  return (
    <LegalLayout title="Política de Privacidade">
      <section>
        <h2>1. Dados que coletamos</h2>
        <ul>
          <li><strong>Cadastro:</strong> nome, e-mail e senha (armazenada com hash bcrypt — nunca em texto puro).</li>
          <li><strong>Opcional:</strong> número de telefone, apenas se você vincular o WhatsApp.</li>
          <li>
            <strong>Dados financeiros digitados por você:</strong> descrições, valores,
            categorias, contas e orçamentos. Não acessamos bancos, cartões ou qualquer
            fonte externa — só existe o que você registra.
          </li>
          <li><strong>Mensagens do chat/WhatsApp:</strong> guardadas para exibir seu histórico e processar seus comandos.</li>
        </ul>
      </section>
      <section>
        <h2>2. Para que usamos</h2>
        <ul>
          <li>Operar o serviço (registrar transações, calcular relatórios, enviar alertas e resumos que você solicitar).</li>
          <li>Categorizar gastos automaticamente (por palavras-chave e, quando habilitado, por inteligência artificial).</li>
          <li>Segurança da conta (códigos de redefinição de senha e verificação de e-mail).</li>
        </ul>
        <p>
          <strong>Não vendemos seus dados</strong> e não os usamos para publicidade.
        </p>
      </section>
      <section>
        <h2>3. Com quem os dados são compartilhados (suboperadores)</h2>
        <ul>
          <li><strong>Supabase</strong> (banco de dados PostgreSQL) e <strong>Render/Vercel</strong> (hospedagem) — armazenamento e execução do serviço.</li>
          <li><strong>Twilio</strong> — somente se você usar o canal de WhatsApp (suas mensagens transitam pela plataforma deles).</li>
          <li><strong>Anthropic</strong> — somente quando a categorização por IA está habilitada, o texto do gasto é enviado para classificação.</li>
          <li><strong>Resend</strong> — envio de e-mails transacionais (códigos de verificação/redefinição), quando habilitado.</li>
        </ul>
      </section>
      <section>
        <h2>4. Seus direitos (LGPD)</h2>
        <p>
          Nos termos da Lei Geral de Proteção de Dados (Lei 13.709/2018), você pode, a
          qualquer momento:
        </p>
        <ul>
          <li><strong>Acessar e corrigir</strong> seus dados (diretamente no aplicativo).</li>
          <li><strong>Exportar</strong> suas transações (CSV, na tela de Busca).</li>
          <li><strong>Excluir tudo</strong>: Perfil → Zona de perigo → Excluir conta. A exclusão é imediata e definitiva, em cascata sobre todos os seus registros.</li>
          <li>Solicitar esclarecimentos pelo e-mail de contato abaixo.</li>
        </ul>
      </section>
      <section>
        <h2>5. Segurança</h2>
        <ul>
          <li>Tráfego criptografado (HTTPS) em todas as comunicações.</li>
          <li>Senhas com hash bcrypt; sessões via token com expiração.</li>
          <li>Limite de tentativas de login contra força bruta.</li>
        </ul>
      </section>
      <section>
        <h2>6. Retenção</h2>
        <p>
          Seus dados existem enquanto sua conta existir. Ao excluir a conta, tudo é
          removido do banco de dados imediatamente (sem cópias de retenção próprias;
          backups de infraestrutura dos provedores expiram nos prazos deles).
        </p>
      </section>
      <section>
        <h2>7. Contato do controlador</h2>
        <p>
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-brand underline">{CONTACT_EMAIL}</a>
        </p>
      </section>
    </LegalLayout>
  );
}
