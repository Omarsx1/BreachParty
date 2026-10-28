import { useState } from 'react';
import { CheckCircle2, Send, Sparkles } from 'lucide-react';
import type { Countdown } from '../../hooks/useCountdown';
import type { PlayerSync } from '../../types/game';
import { MAX_ANSWER_LENGTH } from '../../types/game';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { TimerBar } from '../ui/TimerBar';

export interface AnswerInputScreenProps {
  sync: PlayerSync;
  submittedMatchupIds: string[];
  countdown: Countdown;
  onSubmit: (matchupId: string, text: string) => void;
}

export function AnswerInputScreen({
  sync,
  submittedMatchupIds,
  countdown,
  onSubmit,
}: AnswerInputScreenProps) {
  const [draft, setDraft] = useState('');
  const pending = sync.prompts.filter(
    (prompt) => !submittedMatchupIds.includes(prompt.matchupId),
  );

  if (pending.length === 0) {
    return (
      <Card tone="neon" className="animate-rise space-y-4 p-6 text-center">
        <CheckCircle2 className="mx-auto size-12 text-neon" />
        <h1 className="font-display text-xl font-bold uppercase tracking-[0.1em]">
          Respuestas enviadas
        </h1>
        <p className="text-sm text-muted">
          Ahora espera los duelos. Tu próxima misión: votar sin piedad.
        </p>
        <Badge tone="muted">
          {submittedMatchupIds.length} / {sync.prompts.length}
        </Badge>
      </Card>
    );
  }

  const current = pending[0];
  const position = current === undefined ? 0 : sync.prompts.indexOf(current) + 1;

  const submit = () => {
    if (current === undefined) return;
    const text = draft.replace(/\s+/g, ' ').trim();
    if (text.length === 0) return;
    onSubmit(current.matchupId, text);
    setDraft('');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Badge tone="magenta">Escritura · Ronda {sync.round}</Badge>
        <Badge tone="muted">
          {submittedMatchupIds.length}/{sync.prompts.length} enviadas
        </Badge>
      </div>

      <TimerBar {...countdown} label="Tiempo restante" />

      <Card tone="neon" className="space-y-4 p-5">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-neon">
          Prompt {position} de {sync.prompts.length}
        </p>
        <h1 className="font-display text-xl font-semibold leading-snug">{current?.prompt}</h1>

        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value.slice(0, MAX_ANSWER_LENGTH))}
          rows={4}
          maxLength={MAX_ANSWER_LENGTH}
          placeholder="Sé breve, sé cruel, sé gracioso…"
          className="w-full resize-none rounded-xl border border-line bg-void/70 px-3 py-3 text-sm text-ink placeholder:text-muted/50 focus:border-neon focus:outline-none focus:ring-2 focus:ring-neon/30"
        />

        <div className="flex items-center justify-between gap-3">
          <span className="font-mono text-xs text-muted">
            {draft.length}/{MAX_ANSWER_LENGTH}
          </span>
          <Button size="lg" onClick={submit} disabled={draft.trim().length === 0}>
            <Send className="size-4" />
            Enviar
          </Button>
        </div>
      </Card>

      <p className="flex items-start gap-2 font-mono text-xs uppercase leading-relaxed tracking-[0.14em] text-muted">
        <Sparkles className="mt-0.5 size-3.5 text-amber" />
        Nadie sabe quién escribió qué hasta la revelación.
      </p>
    </div>
  );
}
