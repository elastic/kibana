/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import type { LinkedInvestigationsSlotRenderProps } from '@kbn/agentic-investigations-common';
import { LinkedInvestigationsList } from '@kbn/agentic-investigations-common';
import { useLinkedInvestigations } from '@kbn/agentic-investigations-plugin/public';
import { useStatusSignal } from '../connected_status/use_status_signal';

/**
 * Connected component for the escalation details flyout overview tab.
 *
 * Fetches the linked investigations for the given escalation via `useLinkedInvestigations` and
 * renders the shared `LinkedInvestigationsList`. Clicking a row delegates navigation to
 * `onOpenInvestigation`, which the registration context captured at plugin start.
 *
 * This component lives in alertzero (not the shared package) so it can use `useKibana` and the
 * HTTP hooks from `@kbn/agentic-investigations-plugin/public`. The plugin wraps it in
 * `KibanaContextProvider` + `QueryClientProvider` via `makeLazyWithProviders` before passing it
 * as a render prop to `registerEscalationTemplateUI`.
 *
 * The component subscribes to the cross-boundary `statusSignal` so that a status mutation in the
 * escalation header toggle (which runs in a different `QueryClient`) triggers an immediate
 * re-fetch here rather than waiting for the 5 s polling interval.
 */
const ConnectedLinkedInvestigationsInner = ({
  escalationId,
  linkedInvestigationIds,
  onOpenInvestigation,
}: LinkedInvestigationsSlotRenderProps) => {
  const { data, isLoading, isError, refetch } = useLinkedInvestigations({
    escalationId,
    linkedInvestigationIds,
  });

  // Re-fetch immediately when a status mutation lands in the flyout's header toggle.
  // Without this, the list would show stale investigation statuses until the next 5 s poll.
  useStatusSignal(() => void refetch());

  return (
    <LinkedInvestigationsList
      items={data}
      isLoading={isLoading}
      isError={isError}
      onClickItem={(id) => {
        const item = data?.find((inv) => inv.id === id);
        if (item) {
          onOpenInvestigation({ conversationId: item.id, agentId: item.agent_id });
        }
      }}
    />
  );
};

ConnectedLinkedInvestigationsInner.displayName = 'ConnectedLinkedInvestigations';

export const ConnectedLinkedInvestigations = memo(ConnectedLinkedInvestigationsInner);
