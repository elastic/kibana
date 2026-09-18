/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  EuiCallOut,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiFlyoutResizable,
  EuiLoadingSpinner,
  EuiTitle,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useQuery } from '@kbn/react-query';
import { createEsTraceFetcher, TraceWaterfall, useTraceSpans } from '@kbn/llm-trace-waterfall';
import { useKibana } from '../hooks/use_kibana';

/** Public agent_builder route that returns a conversation, including each round's `trace_id`. */
const buildConversationApiPath = (conversationId: string): string =>
  `/api/agent_builder/conversations/${conversationId}`;

/**
 * agent_builder OTel traces land in a space-scoped index. Mirrors
 * `buildAgentBuilderTracesIndexPattern` in agent_builder's `common/traces.ts` (not exported).
 */
const buildTracesIndexPattern = (spaceId: string): string => `traces-agent_builder.otel-${spaceId}`;

const DEFAULT_SPACE_ID = 'default';

/** Minimal shape of the conversation response — only the round trace ids are needed here. */
interface ConversationRoundTrace {
  trace_id?: string | string[];
}
interface ConversationTraceResponse {
  rounds?: ConversationRoundTrace[];
}

/** The trace id is recorded per round (only when tracing is enabled); use the most recent one. */
const resolveTraceId = (rounds: ConversationRoundTrace[] | undefined): string | null => {
  if (!rounds) {
    return null;
  }
  for (let index = rounds.length - 1; index >= 0; index--) {
    const traceId = rounds[index].trace_id;
    if (traceId) {
      return Array.isArray(traceId) ? traceId[0] : traceId;
    }
  }
  return null;
};

export interface InvestigationTraceFlyoutProps {
  conversationId: string;
  onClose: () => void;
}

const flyoutTitle = i18n.translate('xpack.nightshift.investigationTraceFlyout.title', {
  defaultMessage: 'Trace',
});

export function InvestigationTraceFlyout({
  conversationId,
  onClose,
}: InvestigationTraceFlyoutProps): React.ReactElement {
  const { http, data, spaces } = useKibana().services;

  const [spaceId, setSpaceId] = useState<string>(DEFAULT_SPACE_ID);
  useEffect(() => {
    if (!spaces) {
      return;
    }
    let cancelled = false;
    spaces
      .getActiveSpace()
      .then((space) => {
        if (!cancelled) {
          setSpaceId(space.id);
        }
      })
      .catch(() => {
        // Fall back to the default space; the trace query just uses a less specific index.
      });
    return () => {
      cancelled = true;
    };
  }, [spaces]);

  const {
    data: conversation,
    isLoading: isConversationLoading,
    error: conversationError,
  } = useQuery<ConversationTraceResponse, Error>({
    queryKey: ['nightshift.investigationTraceConversation', conversationId],
    queryFn: ({ signal }) =>
      http.get<ConversationTraceResponse>(buildConversationApiPath(conversationId), {
        signal: signal ?? undefined,
      }),
  });

  const traceId = useMemo(() => resolveTraceId(conversation?.rounds), [conversation]);

  const fetchTrace = useMemo(
    () => createEsTraceFetcher(data.search.search, { index: buildTracesIndexPattern(spaceId) }),
    [data.search.search, spaceId]
  );
  const {
    spans,
    durationMs,
    isLoading: areSpansLoading,
    error: spansError,
  } = useTraceSpans(traceId, { fetchTrace, enabled: Boolean(traceId) });

  return (
    <EuiFlyoutResizable
      onClose={onClose}
      aria-labelledby="nightshiftInvestigationTraceFlyoutTitle"
      data-test-subj="nightshiftInvestigationTraceFlyout"
      size={620}
      minWidth={400}
      maxWidth={1200}
      ownFocus={false}
      css={css`
        .euiFlyoutBody__overflowContent {
          height: 100%;
          padding: 0;
        }
        .euiFlyoutBody__overflow {
          overflow: hidden;
        }
      `}
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2 id="nightshiftInvestigationTraceFlyoutTitle" style={{ wordBreak: 'break-all' }}>
            {traceId ? `${flyoutTitle}: ${traceId}` : flyoutTitle}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {isConversationLoading ? (
          <EuiFlexGroup
            justifyContent="center"
            responsive={false}
            css={css`
              padding: 16px;
            `}
          >
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner size="l" />
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : conversationError ? (
          <EuiCallOut
            announceOnMount
            color="warning"
            iconType="warning"
            css={css`
              margin: 16px;
            `}
            title={i18n.translate('xpack.nightshift.investigationTraceFlyout.loadError', {
              defaultMessage: 'Unable to load the investigation trace',
            })}
          />
        ) : !traceId ? (
          <EuiEmptyPrompt
            iconType="chartWaterfall"
            title={
              <h3>
                {i18n.translate('xpack.nightshift.investigationTraceFlyout.noTraceTitle', {
                  defaultMessage: 'No trace available',
                })}
              </h3>
            }
            body={
              <p>
                {i18n.translate('xpack.nightshift.investigationTraceFlyout.noTraceBody', {
                  defaultMessage:
                    'This investigation has no recorded trace. Tracing may be disabled or the run predates it.',
                })}
              </p>
            }
          />
        ) : (
          <div
            css={css`
              height: 100%;
              padding: 16px;
            `}
          >
            <TraceWaterfall
              spans={spans}
              traceId={traceId}
              durationMs={durationMs}
              isLoading={areSpansLoading}
              error={spansError}
            />
          </div>
        )}
      </EuiFlyoutBody>
    </EuiFlyoutResizable>
  );
}
