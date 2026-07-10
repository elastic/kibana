/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { HttpSetup } from '@kbn/core/public';
import type { WorkflowExecutionsTracking } from '@kbn/elastic-assistant-common';
import type { ErrorCategory } from '@kbn/discoveries-schemas';

import type { SourceMetadata } from './diagnostic_report/helpers/build_diagnostic_report';

// Forward-ref stub: the real workflow execution details flyout is implemented by
// the Skills PR (PR8) — see the PR7 commit "Rebalance: hand off loading_callout
// flyout/modal to PR08". The loading callout (this PR, PR7) references the
// component, so a prop-compatible no-op is provided here. FF-off safe: the
// flyout is only rendered on the feature-flag-gated monitoring path
// (`isFlyoutOpen`), which is never reached when the workflows feature flag is OFF.
interface WorkflowExecutionDetailsFlyoutProps {
  alertsContextCount?: number | null;
  approximateFutureTime?: Date | null;
  averageSuccessfulDurationMs?: number;
  averageSuccessfulDurationNanoseconds?: number;
  configuredMaxAlerts?: number;
  connectorActionTypeId?: string;
  connectorModel?: string;
  connectorName?: string;
  dateRangeEnd?: string;
  dateRangeStart?: string;
  discoveriesCount?: number | null;
  duplicatesDroppedCount?: number;
  end?: string | null;
  errorCategory?: ErrorCategory;
  eventActions?: string[] | null;
  executionUuid?: string;
  failedWorkflowId?: string;
  generatedCount?: number;
  generationEndTime?: string;
  generationStatus?: 'started' | 'succeeded' | 'failed' | 'canceled' | 'dismissed';
  hallucinationsFilteredCount?: number;
  http: HttpSetup;
  loadingMessage?: string;
  localStorageAttackDiscoveryMaxAlerts?: string;
  onClose: () => void;
  onRefresh?: () => void;
  persistedCount?: number;
  reason?: string;
  sourceMetadata?: SourceMetadata | null;
  start?: string | null;
  successfulGenerations?: number;
  workflowExecutions?: WorkflowExecutionsTracking | null;
  workflowId: string | null | undefined;
  workflowRunId: string | null | undefined;
}

export const WorkflowExecutionDetailsFlyout: React.FC<WorkflowExecutionDetailsFlyoutProps> =
  React.memo(() => null);
WorkflowExecutionDetailsFlyout.displayName = 'WorkflowExecutionDetailsFlyout';
