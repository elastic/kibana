/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiSpacer, EuiTitle } from '@elastic/eui';

import { usePndConversations } from '../../../../hooks/use_pnd_conversations';
import { PndQueryState } from '../../../../states';
import { selectThreadConversations } from '../../helpers/select_thread_conversations';
import * as i18n from '../../translations';
import { ThreadAttachments } from './thread_attachments';

export interface LifecycleAttachmentsSectionProps {
  correlationId: string;
}

/**
 * The Attack Discovery markdown, the proposed change and the backtest, as the **real** Agent Builder
 * attachments `POST /internal/pnd/threads/_ensure` creates on each proposal thread.
 *
 * Threads come from `GET /internal/pnd/conversations` — the same cache entry the chats view and the
 * lifecycle view read, under one `queryFn` — rather than from the derived ids. Deriving always
 * answers, including for a thread nothing has created, so deriving would turn "no proposal has
 * parked a gate yet" into three guaranteed 404s. Reading the list means a section appears exactly
 * when the thread really exists and this analyst can read it.
 *
 * Attachments are read per thread rather than for the discovery, because the route is per
 * conversation and a discovery has up to one thread per registered gate (D1).
 *
 * An empty section is the **ordinary** state and reads as one: nothing here is a failure until a
 * request fails with something other than a 404, which the route uses for every refusal on purpose.
 *
 * A **section inside Overview** rather than a tab of its own since decision 1 of the 2026-08-17 sync,
 * which enumerates attachments as Overview content.
 *
 * Note the deliberate asymmetry this section makes visible (D10): the attachments below are readable by
 * the **analyst**, not by the PND agents — they keep `NO_TOOLS` this round — so nothing here should
 * be read as context the agent has already seen.
 */
export const LifecycleAttachmentsSection: React.FC<LifecycleAttachmentsSectionProps> = ({
  correlationId,
}) => {
  const { data, error, isLoading, refetch } = usePndConversations({
    enabled: correlationId !== '',
  });

  const threads = useMemo(
    () =>
      selectThreadConversations({
        correlationId,
        conversations: data?.conversations ?? [],
      }),
    [correlationId, data]
  );

  const onRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  return (
    <div data-test-subj="pndLifecycleSection-attachments">
      <EuiTitle size="xs">
        <h3>{i18n.SECTION_ATTACHMENTS}</h3>
      </EuiTitle>

      <EuiSpacer size="s" />

      <PndQueryState
        emptyBody={i18n.ATTACHMENTS_EMPTY_BODY}
        emptyTitle={i18n.ATTACHMENTS_EMPTY_TITLE}
        error={error}
        isEmpty={threads.length === 0}
        isLoading={isLoading}
        loadingLabel={i18n.ATTACHMENTS_LOADING}
        onRetry={onRetry}
      >
        {threads.map((conversation) => (
          <ThreadAttachments
            correlationId={correlationId}
            conversation={conversation}
            key={conversation.id}
          />
        ))}
      </PndQueryState>
    </div>
  );
};
