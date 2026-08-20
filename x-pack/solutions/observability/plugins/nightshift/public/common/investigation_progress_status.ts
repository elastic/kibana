/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { InvestigationStatus } from '@kbn/investigation-output';
import type { InvestigationRunStatus } from '@kbn/significant-events-schema';

const RUN_STATUS_TO_INVESTIGATION_STATUS: Record<InvestigationRunStatus, InvestigationStatus> = {
  pending: 'running',
  complete: 'complete',
  failed: 'failed',
};

/** Adapts the three states the API reports onto the richer status the badges render. */
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
): status is 'failed' | 'unavailable' => status === 'failed' || status === 'unavailable';

export const getInvestigationWorkflowStatusLabel = (status: InvestigationStatus): string => {
  if (isInvestigationInvestigated(status)) {
    return getInvestigationProgressStatusLabel(true);
  }

  switch (status) {
    // `unavailable` means the result could not be read rather than that the run itself broke, but
    // both leave the user with no investigation, so they share one label.
    case 'failed':
    case 'unavailable':
      return i18n.translate('xpack.nightshift.investigation.statusFailed', {
        defaultMessage: 'Investigation failed',
      });
    case 'loading':
      return i18n.translate('xpack.nightshift.investigation.statusLoading', {
        defaultMessage: 'Loading investigation',
      });
    default:
      return getInvestigationProgressStatusLabel(false);
  }
};
