/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable react/jsx-no-literals, @elastic/eui/tooltip-button-icon-wrap -- scripted prototype conversation */

import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingSpinner,
  EuiPanel,
  EuiPortal,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import type { DetonateFileOption } from './select_file_panel';

export const DETONATE_CHAT_TEST_ID = 'detonateChat';

const INITIAL_PROMPT = 'Detonate a file from this alert';
const THINKING_MS = 1200;
const DETONATING_MS = 3500;

type Verdict = 'Malicious' | 'Suspicious' | 'Benign';

const VERDICT_BY_FILE: Record<string, { verdict: Verdict; score: number }> = {
  'alert-file': { verdict: 'Malicious', score: 92 },
  'dropped-file': { verdict: 'Malicious', score: 88 },
  'downloaded-file': { verdict: 'Suspicious', score: 61 },
};

const VERDICT_COLOR: Record<Verdict, string> = {
  Malicious: 'danger',
  Suspicious: 'warning',
  Benign: 'success',
};

const NEXT_STEPS: Record<Verdict, Array<{ label: string; reply: string; icon: string }>> = {
  Malicious: [
    {
      label: 'Isolate host',
      icon: 'lock',
      reply:
        'Done. The host is isolated from the network (simulated). I added a note to the alert.',
    },
    {
      label: 'Add to new case',
      icon: 'briefcase',
      reply: 'I created a case with the detonation report attached and linked this alert to it.',
    },
    {
      label: 'Turn on rule',
      icon: 'play',
      reply: 'The rule is turned on, so this behavior is prevented from now on.',
    },
  ],
  Suspicious: [
    {
      label: 'Add to new case',
      icon: 'briefcase',
      reply: 'I created a case with the detonation report attached so an analyst can review it.',
    },
    {
      label: 'Detonate another file',
      icon: 'refresh',
      reply: 'Sure. Which file would you like to detonate next?',
    },
  ],
  Benign: [
    {
      label: 'Open GH issue',
      icon: 'logoGithub',
      reply: 'I drafted a GH issue for the Detections team to fine tune this rule.',
    },
  ],
};

type DistributiveOmit<T, K extends keyof never> = T extends unknown ? Omit<T, K> : never;

type Message =
  | { id: number; role: 'user'; text: string }
  | { id: number; role: 'agent'; kind: 'text'; text: string }
  | { id: number; role: 'agent'; kind: 'thinking' }
  | { id: number; role: 'agent'; kind: 'files' }
  | { id: number; role: 'agent'; kind: 'detonating'; fileName: string }
  | { id: number; role: 'agent'; kind: 'result'; file: DetonateFileOption }
  | { id: number; role: 'agent'; kind: 'steps'; file: DetonateFileOption };

interface DetonateChatProps {
  files: DetonateFileOption[];
  onClose: () => void;
  /** Opens the detonation report of the attached detonation. */
  onViewReport: () => void;
}

/**
 * Prototype: a scripted AI Agent conversation. The user asks to detonate, the agent asks which
 * file (with options), attaches the detonation and offers next steps. Nothing is sent anywhere.
 */
export const DetonateChat = memo(({ files, onClose, onViewReport }: DetonateChatProps) => {
  const { euiTheme } = useEuiTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState(INITIAL_PROMPT);
  const [hasSentPrompt, setHasSentPrompt] = useState(false);
  const nextId = useRef(1);
  const timers = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  const push = useCallback((message: DistributiveOmit<Message, 'id'>) => {
    const id = nextId.current++;
    setMessages((current) => [...current, { ...message, id } as Message]);
    return id;
  }, []);
  const replace = useCallback((id: number, message: DistributiveOmit<Message, 'id'>) => {
    setMessages((current) =>
      current.map((m) => (m.id === id ? ({ ...message, id } as Message) : m))
    );
  }, []);
  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  }, []);

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
    },
    []
  );
  useEffect(() => {
    bottomRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  // Agent answers after a short "thinking" moment.
  const agentReplies = useCallback(
    (build: () => DistributiveOmit<Message, 'id'>) => {
      const thinkingId = push({ role: 'agent', kind: 'thinking' });
      later(() => replace(thinkingId, build()), THINKING_MS);
    },
    [push, replace, later]
  );

  const askWhichFile = useCallback(() => {
    agentReplies(() => ({ role: 'agent', kind: 'files' }));
  }, [agentReplies]);

  const handleSend = useCallback(() => {
    if (!input.trim() || hasSentPrompt) return;
    push({ role: 'user', text: input.trim() });
    setInput('');
    setHasSentPrompt(true);
    askWhichFile();
  }, [input, hasSentPrompt, push, askWhichFile]);

  const handlePickFile = useCallback(
    (file: DetonateFileOption) => {
      push({ role: 'user', text: file.fileName });
      const detonatingId = push({ role: 'agent', kind: 'detonating', fileName: file.fileName });
      later(() => {
        replace(detonatingId, { role: 'agent', kind: 'result', file });
        later(() => push({ role: 'agent', kind: 'steps', file }), 600);
      }, DETONATING_MS);
    },
    [push, replace, later]
  );

  const handleStep = useCallback(
    (step: { label: string; reply: string }) => {
      push({ role: 'user', text: step.label });
      if (step.label === 'Detonate another file') {
        askWhichFile();
        return;
      }
      agentReplies(() => ({ role: 'agent', kind: 'text', text: step.reply }));
    },
    [push, agentReplies, askWhichFile]
  );

  const renderMessage = (message: Message) => {
    if (message.role === 'user') {
      return (
        <div css={{ display: 'flex', justifyContent: 'flex-end' }} key={message.id}>
          <EuiPanel color="primary" paddingSize="s" hasShadow={false} css={{ maxWidth: '85%' }}>
            <EuiText size="s">{message.text}</EuiText>
          </EuiPanel>
        </div>
      );
    }
    switch (message.kind) {
      case 'thinking':
        return (
          <EuiFlexGroup key={message.id} gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner size="m" />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText size="s" color="subdued">
                Thinking…
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        );
      case 'text':
        return (
          <EuiText size="s" key={message.id}>
            {message.text}
          </EuiText>
        );
      case 'files':
        return (
          <div key={message.id} data-test-subj="detonateChatFileOptions">
            <EuiText size="s">
              Which file would you like to detonate? These are the files I found for this alert:
            </EuiText>
            <EuiSpacer size="s" />
            <EuiFlexGroup direction="column" gutterSize="s" responsive={false}>
              {files.map((file) => (
                <EuiFlexItem key={file.id} grow={false}>
                  <EuiPanel
                    hasBorder
                    hasShadow={false}
                    paddingSize="s"
                    onClick={() => handlePickFile(file)}
                    data-test-subj={`detonateChatFile-${file.id}`}
                  >
                    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                      <EuiFlexItem>
                        <EuiText size="s">
                          <strong>{file.fileName}</strong>
                        </EuiText>
                        <EuiText size="xs" color="subdued">
                          {file.description}
                        </EuiText>
                      </EuiFlexItem>
                      {file.badge && (
                        <EuiFlexItem grow={false}>
                          <EuiBadge color={file.badgeColor ?? 'hollow'}>{file.badge}</EuiBadge>
                        </EuiFlexItem>
                      )}
                    </EuiFlexGroup>
                  </EuiPanel>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          </div>
        );
      case 'detonating':
        return (
          <EuiFlexGroup key={message.id} gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner size="m" />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText size="s">{`Detonating ${message.fileName} in an isolated sandbox…`}</EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        );
      case 'result': {
        const { verdict, score } = VERDICT_BY_FILE[message.file.id] ?? {
          verdict: 'Malicious' as Verdict,
          score: 90,
        };
        return (
          <div key={message.id} data-test-subj="detonateChatResult">
            <EuiText size="s">
              The detonation is complete. I attached the report to this conversation.
            </EuiText>
            <EuiSpacer size="s" />
            <EuiPanel hasBorder hasShadow={false} paddingSize="s">
              <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiIcon type="bug" size="m" aria-hidden={true} />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiText size="s">
                    <strong>{message.file.fileName}</strong>
                  </EuiText>
                  <EuiText size="xs" color="subdued">
                    Detonation report
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiBadge color={VERDICT_COLOR[verdict]}>{`${verdict} · ${score}`}</EuiBadge>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiSpacer size="s" />
              <EuiButtonEmpty
                size="xs"
                iconType="eye"
                onClick={onViewReport}
                data-test-subj="detonateChatViewReport"
              >
                View report
              </EuiButtonEmpty>
            </EuiPanel>
            <EuiSpacer size="s" />
            <EuiText size="s">
              {verdict === 'Malicious'
                ? `${message.file.fileName} is malicious. It wrote to a remote process, contacted known C2 infrastructure and matched the NukeBot YARA rule.`
                : `${message.file.fileName} looks suspicious. It showed some risky behavior, but nothing conclusive.`}
            </EuiText>
          </div>
        );
      }
      case 'steps': {
        const { verdict } = VERDICT_BY_FILE[message.file.id] ?? { verdict: 'Malicious' as Verdict };
        return (
          <div key={message.id} data-test-subj="detonateChatNextSteps">
            <EuiText size="s">Here is what I suggest next:</EuiText>
            <EuiSpacer size="s" />
            <EuiFlexGroup gutterSize="s" wrap responsive={false}>
              {NEXT_STEPS[verdict].map((step) => (
                <EuiFlexItem grow={false} key={step.label}>
                  <EuiButton
                    size="s"
                    iconType={step.icon}
                    onClick={() => handleStep(step)}
                    data-test-subj={`detonateChatStep-${step.label}`}
                  >
                    {step.label}
                  </EuiButton>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          </div>
        );
      }
      default:
        return null;
    }
  };

  return (
    <EuiPortal>
      <EuiPanel
        paddingSize="none"
        hasBorder
        css={{
          position: 'fixed',
          top: 56,
          right: 8,
          bottom: 8,
          width: 420,
          zIndex: Number(euiTheme.levels.flyout) + 10,
          display: 'flex',
          flexDirection: 'column',
        }}
        data-test-subj={DETONATE_CHAT_TEST_ID}
      >
        <EuiFlexGroup
          alignItems="center"
          justifyContent="spaceBetween"
          responsive={false}
          css={{
            flexGrow: 0,
            flexShrink: 0,
            padding: euiTheme.size.m,
            borderBottom: euiTheme.border.thin,
          }}
        >
          <EuiFlexItem grow={false}>
            <EuiTitle size="xxs">
              <h3>New Conversation</h3>
            </EuiTitle>
            <EuiText size="xs" color="subdued">
              Elastic AI Agent
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              iconType="cross"
              aria-label="Close"
              onClick={onClose}
              data-test-subj="detonateChatClose"
            />
          </EuiFlexItem>
        </EuiFlexGroup>

        <div css={{ flex: '1 1 0', minHeight: 0, overflowY: 'auto', padding: euiTheme.size.m }}>
          {messages.length === 0 && (
            <EuiTitle size="m">
              <h2 css={{ textAlign: 'center', marginTop: 120 }}>How can I help you?</h2>
            </EuiTitle>
          )}
          <EuiFlexGroup direction="column" gutterSize="m" responsive={false}>
            {messages.map((message) => (
              <EuiFlexItem grow={false} key={message.id}>
                {renderMessage(message)}
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
          <div ref={bottomRef} />
        </div>

        <div css={{ flexShrink: 0, padding: euiTheme.size.m, borderTop: euiTheme.border.thin }}>
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem>
              <EuiFieldText
                fullWidth
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask anything"
                aria-label="Message"
                disabled={hasSentPrompt}
                data-test-subj="detonateChatInput"
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                display="fill"
                iconType="sortUp"
                aria-label="Send"
                onClick={handleSend}
                isDisabled={hasSentPrompt || !input.trim()}
                data-test-subj="detonateChatSend"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>
      </EuiPanel>
    </EuiPortal>
  );
});
DetonateChat.displayName = 'DetonateChat';
