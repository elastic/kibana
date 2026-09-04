/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef, useState } from 'react';
import {
  isChatCompletionChunkEvent,
  isChatCompletionMessageEvent,
  MessageRole,
} from '@kbn/inference-common';
import { GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR } from '@kbn/management-settings-ids';
import { RUM_LLM_SYSTEM_PROMPT } from '../../../../common/rum_llm';
import {
  parseEvidenceSummary,
  visibleEvidenceSummary,
  type EvidenceSummaryResult,
} from '../../../../common/rum_evidence';
import { useKibanaServices } from '../../../hooks/use_kibana_services';

export type EvidenceSummaryStatus = 'idle' | 'unavailable' | 'streaming' | 'done' | 'error';

export function useEvidenceSummary({ ready, prompt }: { ready: boolean; prompt: string }) {
  const { inference, uiSettings } = useKibanaServices();
  const [connectorId, setConnectorId] = useState<string>('');
  const [connectorReady, setConnectorReady] = useState(false);
  const [status, setStatus] = useState<EvidenceSummaryStatus>('idle');
  const [raw, setRaw] = useState('');
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);
  const rawRef = useRef('');

  useEffect(() => {
    let cancelled = false;
    void inference
      .getConnectors()
      .then((list) => {
        if (cancelled) {
          return;
        }
        const usable = list.filter((connector) => !connector.isMissingSecrets);
        const settingsDefault = uiSettings.get<string | undefined>(
          GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR
        );
        const preferred =
          usable.find((connector) => connector.connectorId === settingsDefault) ?? usable[0];
        setConnectorId(preferred?.connectorId ?? '');
        setConnectorReady(true);
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
        setConnectorId('');
        setConnectorReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [inference, uiSettings]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      subscriptionRef.current?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!ready || !prompt || !connectorReady) {
      return;
    }
    if (!connectorId) {
      setStatus('unavailable');
      return;
    }
    abortRef.current?.abort();
    subscriptionRef.current?.unsubscribe();
    const abort = new AbortController();
    abortRef.current = abort;
    rawRef.current = '';
    setRaw('');
    setError(null);
    setStatus('streaming');
    try {
      const events$ = inference.chatComplete({
        connectorId,
        system: RUM_LLM_SYSTEM_PROMPT,
        messages: [{ role: MessageRole.User, content: prompt }],
        stream: true,
        abortSignal: abort.signal,
      });
      subscriptionRef.current = events$.subscribe({
        next: (event) => {
          if (isChatCompletionChunkEvent(event) && event.content) {
            rawRef.current += event.content;
            setRaw(rawRef.current);
            return;
          }
          if (isChatCompletionMessageEvent(event) && event.content) {
            rawRef.current = event.content;
            setRaw(event.content);
          }
        },
        error: (err) => {
          if (abort.signal.aborted) {
            return;
          }
          setStatus('error');
          setError(err instanceof Error ? err.message : String(err));
        },
        complete: () => {
          if (abort.signal.aborted) {
            return;
          }
          if (!rawRef.current.trim()) {
            setStatus('error');
            setError('empty');
            return;
          }
          setStatus('done');
        },
      });
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : String(err));
    }
    return () => {
      abort.abort();
      subscriptionRef.current?.unsubscribe();
    };
  }, [connectorId, connectorReady, inference, prompt, ready]);

  const parsed: EvidenceSummaryResult =
    status === 'done'
      ? parseEvidenceSummary(raw)
      : { markdown: visibleEvidenceSummary(raw), fileIssue: false };

  const waitingForConnector = ready && Boolean(prompt) && !connectorReady && status === 'idle';

  return {
    status: waitingForConnector ? 'streaming' : status,
    markdown: parsed.markdown,
    fileIssue: parsed.fileIssue,
    issueTitle: parsed.issueTitle,
    error,
  };
}
