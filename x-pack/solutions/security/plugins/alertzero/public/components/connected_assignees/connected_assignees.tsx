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
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';
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
  useKibana<CoreStart>(); // ensure context; capabilities are read via the shared hook below
  const { manageEscalations, manageInvestigations } = useAgenticInvestigationsCapabilities();

  const canManage =
    templateId === 'escalation' ? manageEscalations && status !== 'closed' : manageInvestigations;

  const assignInvestigation = useAssignInvestigation();
  const assignEscalation = useAssignEscalation();

  const assign = useCallback(
    (targetId: string, assignees: string[]) =>
      templateId === 'escalation'
        ? assignEscalation.mutateAsync({ escalationId: targetId, assignees })
        : assignInvestigation.mutateAsync({ investigationId: targetId, assignees }),
    [templateId, assignEscalation, assignInvestigation]
  );

  // refetchConversation's identity changes every render from the Agent Builder; the pickers
  // hook stores refresh in a ref so an unstable reference here is fine.
  const refresh = useCallback(
    () => (refetchConversation ? refetchConversation() : Promise.resolve()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [refetchConversation]
  );

  // Wrap in a stable array so the bulk profile fetch doesn't retrigger on every render.
  const items = useMemo(
    () => [{ conversationId, assigneeUids: (assigneeUids ?? []) as string[] }],
    [conversationId, assigneeUids]
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
