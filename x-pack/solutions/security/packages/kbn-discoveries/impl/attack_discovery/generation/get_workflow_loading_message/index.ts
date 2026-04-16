/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { getAttackDiscoveryLoadingMessage } from '@kbn/elastic-assistant-common';

import type { WorkflowConfig } from '../types';

const getCustomQueryDescription = ({
  alertsCount,
  end,
  start,
}: {
  alertsCount: number;
  end?: string;
  start?: string;
}): string => {
  const isDefaultRange = start === 'now-24h' && end === 'now';
  const hasRange = end != null && start != null;
  const hasStart = start != null;

  if (isDefaultRange || (!hasRange && !hasStart)) {
    return i18n.translate('xpack.discoveries.getWorkflowLoadingMessage.customQueryDefault', {
      defaultMessage:
        'up to {alertsCount} {alertsCount, plural, =1 {alert} other {alerts}} in the last 24 hours',
      values: { alertsCount },
    });
  }

  if (hasRange) {
    return i18n.translate('xpack.discoveries.getWorkflowLoadingMessage.customQueryRange', {
      defaultMessage:
        'up to {alertsCount} {alertsCount, plural, =1 {alert} other {alerts}} from {start} to {end}',
      values: { alertsCount, end, start },
    });
  }

  return i18n.translate('xpack.discoveries.getWorkflowLoadingMessage.customQueryFrom', {
    defaultMessage: 'up to {alertsCount} {alertsCount, plural, =1 {alert} other {alerts}} {start}',
    values: { alertsCount, start },
  });
};

const getEsqlDescription = (): string =>
  i18n.translate('xpack.discoveries.getWorkflowLoadingMessage.esql', {
    defaultMessage: 'alerts retrieved via ES|QL',
  });

const getProvidedDescription = (alertsCount: number): string =>
  i18n.translate('xpack.discoveries.getWorkflowLoadingMessage.provided', {
    defaultMessage: '{alertsCount} pre-provided {alertsCount, plural, =1 {alert} other {alerts}}',
    values: { alertsCount },
  });

const getWorkflowsDescription = (workflowCount: number): string =>
  i18n.translate('xpack.discoveries.getWorkflowLoadingMessage.workflows', {
    defaultMessage:
      'alerts from {workflowCount} {workflowCount, plural, =1 {workflow} other {workflows}}',
    values: { workflowCount },
  });

/**
 * Generates a context-aware loading message based on the workflow configuration.
 *
 * Produces different messages depending on the alert retrieval mode and
 * whether custom workflows are selected:
 *
 * - Custom query only: "AI is analyzing up to N alerts in the last 24 hours..."
 * - ES|QL only: "AI is analyzing alerts retrieved via ES|QL..."
 * - Workflows only: "AI is analyzing alerts from N workflows..."
 * - Custom query + workflows: combined message
 * - ES|QL + workflows: combined message
 * - Disabled + no workflows: falls back to the default custom query message
 */
export const getWorkflowLoadingMessage = ({
  alertsCount,
  end,
  start,
  workflowConfig,
}: {
  alertsCount: number;
  end?: string;
  start?: string;
  workflowConfig: WorkflowConfig;
}): string => {
  const { alert_retrieval_mode: mode, alert_retrieval_workflow_ids: alertRetrievalWorkflowIds } =
    workflowConfig;
  const workflowCount = alertRetrievalWorkflowIds.length;
  const hasCustomWorkflows = workflowCount > 0;

  const parts: string[] = [
    ...(mode === 'custom_query'
      ? [getCustomQueryDescription({ alertsCount, end, start })]
      : mode === 'esql'
      ? [getEsqlDescription()]
      : mode === 'provided'
      ? [getProvidedDescription(alertsCount)]
      : []),
    ...(hasCustomWorkflows ? [getWorkflowsDescription(workflowCount)] : []),
  ];

  if (parts.length === 0) {
    return getAttackDiscoveryLoadingMessage({ alertsCount, end, start });
  }

  return i18n.translate('xpack.discoveries.getWorkflowLoadingMessage.analyzing', {
    defaultMessage: 'AI is analyzing {description} to generate discoveries.',
    values: { description: parts.join(' and ') },
  });
};
