/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { useQueryClient } from '@kbn/react-query';
import { AssignToUsers } from '@kbn/agentic-investigations-common';
import {
  useAssignInvestigation,
  useAssigneePickers,
  useCanManageInvestigations,
} from '@kbn/agentic-investigations-plugin/public';
import type { InvestigationSummary } from '@kbn/agentic-investigations-plugin/common';
import { i18n } from '@kbn/i18n';
import { NIGHTSHIFT_INVESTIGATIONS_QUERY_KEY } from '../../../data/investigations/use_fetch_investigations';

const ASSIGNEES_LABELS = {
  assignSuccess: i18n.translate('xpack.nightshift.investigations.cardAssignSuccess', {
    defaultMessage: 'Assignees updated',
  }),
  assignError: i18n.translate('xpack.nightshift.investigations.cardAssignError', {
    defaultMessage: 'Failed to update assignees',
  }),
};

/**
 * The assignee avatars and picker for each card in a list, with the same rules as the
 * investigation flyout: read-only once the investigation is closed or when the user cannot manage
 * investigations. Profiles for every card in the list are resolved in one request.
 */
export const useInvestigationAssignees = (
  investigations: InvestigationSummary[]
): ((investigation: InvestigationSummary) => React.ReactNode) => {
  const queryClient = useQueryClient();
  const canManage = useCanManageInvestigations();
  const assignInvestigation = useAssignInvestigation();

  const refresh = useCallback(
    // Covers both the home page sections and the onboarding trial investigation.
    () => queryClient.invalidateQueries({ queryKey: NIGHTSHIFT_INVESTIGATIONS_QUERY_KEY }),
    [queryClient]
  );

  const getPickerProps = useAssigneePickers({
    items: investigations,
    getRowKey: (investigation) => investigation.id,
    getTargetId: (investigation) => investigation.id,
    getAssigneeUids: (investigation) => investigation.metadata.assignees ?? [],
    assign: (investigationId, assignees) =>
      assignInvestigation.mutateAsync({ investigationId, assignees }),
    refresh,
    canManage,
    isReadOnly: (investigation) => investigation.metadata.status === 'closed',
    labels: ASSIGNEES_LABELS,
    buttonIconSize: 's',
  });

  return useCallback(
    (investigation: InvestigationSummary): React.ReactNode => (
      <AssignToUsers {...getPickerProps(investigation)} />
    ),
    [getPickerProps]
  );
};
