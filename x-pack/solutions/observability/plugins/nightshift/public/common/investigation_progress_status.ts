/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { InvestigationStatus } from '@kbn/investigation-output';
import type { InvestigationRunStatus } from '@kbn/significant-events-schema';

// Investigations have no failed state any more; a run status recorded as failed reads as
// unavailable.
const RUN_STATUS_TO_INVESTIGATION_STATUS: Record<InvestigationRunStatus, InvestigationStatus> = {
  pending: 'running',
  complete: 'complete',
  failed: 'unavailable',
  unavailable: 'unavailable',
};

export const toInvestigationStatus = (status: InvestigationRunStatus): InvestigationStatus =>
  RUN_STATUS_TO_INVESTIGATION_STATUS[status];

export const getInvestigationProgressStatusLabel = (isInvestigated: boolean): string =>
  isInvestigated
    ? i18n.translate('xpack.nightshift.investigation.progressInvestigated', {
        defaultMessage: 'Investigated',
      })
    : i18n.translate('xpack.nightshift.investigation.progressInvestigating', {
        defaultMessage: 'Investigating',
      });

export const isInvestigationInvestigated = (status: InvestigationStatus): status is 'complete' =>
  status === 'complete';

export const isInvestigationTerminalFailure = (
  status: InvestigationStatus
): status is 'unavailable' => status === 'unavailable';

export const getInvestigationWorkflowStatusLabel = (status: InvestigationStatus): string => {
  if (isInvestigationInvestigated(status)) {
    return getInvestigationProgressStatusLabel(true);
  }

  switch (status) {
    case 'unavailable':
      return i18n.translate('xpack.nightshift.investigation.statusUnavailable', {
        defaultMessage: 'Investigation unavailable',
      });
    case 'loading':
      return i18n.translate('xpack.nightshift.investigation.statusLoading', {
        defaultMessage: 'Loading investigation',
      });
    default:
      return getInvestigationProgressStatusLabel(false);
  }
};
