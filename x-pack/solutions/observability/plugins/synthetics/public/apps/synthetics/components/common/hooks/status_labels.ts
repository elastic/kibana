/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { PrivateLocationHealthStatusValue } from '../../../../../../common/runtime_types';

export const STATUS_LABELS: Record<
  Exclude<PrivateLocationHealthStatusValue, PrivateLocationHealthStatusValue.Healthy>,
  string
> = {
  [PrivateLocationHealthStatusValue.MissingPackagePolicy]: i18n.translate(
    'xpack.synthetics.monitorHealth.status.missingPackagePolicy',
    {
      defaultMessage:
        'The Fleet package policy for this monitor and private location pair does not exist.',
    }
  ),
  [PrivateLocationHealthStatusValue.MissingAgentPolicy]: i18n.translate(
    'xpack.synthetics.monitorHealth.status.missingAgentPolicy',
    {
      defaultMessage: 'The agent policy referenced by this private location no longer exists.',
    }
  ),
  [PrivateLocationHealthStatusValue.MissingLocation]: i18n.translate(
    'xpack.synthetics.monitorHealth.status.missingLocation',
    {
      defaultMessage: 'The monitor references a private location that no longer exists.',
    }
  ),
  [PrivateLocationHealthStatusValue.MissingAgents]: i18n.translate(
    'xpack.synthetics.monitorHealth.status.missingAgents',
    {
      defaultMessage:
        'No Fleet agents are enrolled in the agent policy for this private location. Enroll an agent in Fleet to resolve this.',
    }
  ),
  [PrivateLocationHealthStatusValue.UnhealthyAgent]: i18n.translate(
    'xpack.synthetics.monitorHealth.status.unhealthyAgent',
    {
      defaultMessage:
        'All Fleet agents for this private location are unhealthy or offline. Check the agent status in Fleet.',
    }
  ),
};

export const getStatusLabel = (status: PrivateLocationHealthStatusValue): string | undefined => {
  if (status === PrivateLocationHealthStatusValue.Healthy) return undefined;
  return STATUS_LABELS[status];
};

export const RESET_FIXABLE_STATUSES = new Set([
  PrivateLocationHealthStatusValue.MissingPackagePolicy,
]);

export const isFixableByResetStatus = (status: PrivateLocationHealthStatusValue): boolean =>
  RESET_FIXABLE_STATUSES.has(status);
