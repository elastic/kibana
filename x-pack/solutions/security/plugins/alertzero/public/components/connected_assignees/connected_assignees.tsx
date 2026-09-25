/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo } from 'react';
import type { AssigneesSlotRenderProps } from '@kbn/agentic-investigations-common';
import {
  useAssignEscalation,
  useAssignInvestigation,
} from '@kbn/agentic-investigations-plugin/public';
import { CONNECTED_ASSIGNEES_LABELS } from './translations';
import { useAssigneePickers } from './use_assignee_pickers';
import { useAgenticInvestigationsCapabilities } from '../../hooks/use_agentic_investigations_capabilities';

/**
 * Connected assignee picker for the investigation and escalation flyout headers.
 *
 * This component lives in alertzero's plugin (not the shared package) so it can use
 * `useKibana`, HTTP mutation hooks, and capability checks — none of which are available
 * inside the Agent Builder flyout's isolated React root.
 *
 * At registration time the plugin wraps this in `KibanaContextProvider` +
 * `QueryClientProvider`, so all hooks below have the context they need.
 */
const ConnectedAssigneesInner = ({
  conversationId,
  templateId,
  assigneeUids,
  status,
  refetchConversation,
}: AssigneesSlotRenderProps) => {
  const { manageEscalations, manageInvestigations } = useAgenticInvestigationsCapabilities();

  const canManage =
    (templateId === 'escalation' ? manageEscalations : manageInvestigations) && status !== 'closed';

  const assignInvestigation = useAssignInvestigation();
  const assignEscalation = useAssignEscalation();

  const assign = useCallback(
    (targetId: string, assignees: string[]) =>
      templateId === 'escalation'
        ? assignEscalation.mutateAsync({ escalationId: targetId, assignees })
        : assignInvestigation.mutateAsync({ investigationId: targetId, assignees }),
    [templateId, assignEscalation, assignInvestigation]
  );

  // useAssigneePickers holds refresh in a ref, so an unstable reference here is fine.
  const refresh = () => refetchConversation?.() ?? Promise.resolve();

  // Stable uid array by value so the bulk profile fetch doesn't retrigger on every render.
  const uidsKey = (assigneeUids ?? []).join(',');
  const stableUids = useMemo(() => (uidsKey ? uidsKey.split(',') : []), [uidsKey]);

  const items = useMemo(
    () => [{ conversationId, assigneeUids: stableUids }],
    [conversationId, stableUids]
  );

  const renderPicker = useAssigneePickers({
    items,
    getRowKey: (item) => item.conversationId,
    getTargetId: (item) => item.conversationId,
    getAssigneeUids: (item) => item.assigneeUids,
    assign,
    refresh,
    canManage,
    labels: CONNECTED_ASSIGNEES_LABELS,
  });

  return <>{renderPicker(items[0])}</>;
};

ConnectedAssigneesInner.displayName = 'ConnectedAssignees';

export const ConnectedAssignees = memo(ConnectedAssigneesInner);
