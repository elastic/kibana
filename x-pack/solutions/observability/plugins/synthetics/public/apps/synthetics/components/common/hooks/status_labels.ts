/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { LocationHealthStatusValue } from '../../../../../../common/runtime_types';

export const STATUS_LABELS: Record<
  Exclude<LocationHealthStatusValue, LocationHealthStatusValue.Healthy>,
  string
> = {
  [LocationHealthStatusValue.MissingPackagePolicy]: i18n.translate(
    'xpack.synthetics.monitorHealth.status.missingPackagePolicy',
    {
      defaultMessage: 'The Fleet package policy for this monitor/location pair does not exist.',
    }
  ),
  [LocationHealthStatusValue.MissingAgentPolicy]: i18n.translate(
    'xpack.synthetics.monitorHealth.status.missingAgentPolicy',
    {
      defaultMessage: 'The agent policy referenced by this private location no longer exists.',
    }
  ),
  [LocationHealthStatusValue.AgentPolicyMismatch]: i18n.translate(
    'xpack.synthetics.monitorHealth.status.agentPolicyMismatch',
    {
      defaultMessage:
        'The package policy exists but is attached to a different agent policy than expected.',
    }
  ),
  [LocationHealthStatusValue.MissingLocation]: i18n.translate(
    'xpack.synthetics.monitorHealth.status.missingLocation',
    {
      defaultMessage: 'The monitor references a private location that no longer exists.',
    }
  ),
  [LocationHealthStatusValue.PackageNotInstalled]: i18n.translate(
    'xpack.synthetics.monitorHealth.status.packageNotInstalled',
    {
      defaultMessage: 'The synthetics Fleet package is not installed.',
    }
  ),
};

export const getStatusLabel = (status: LocationHealthStatusValue): string | undefined => {
  if (status === LocationHealthStatusValue.Healthy) return undefined;
  return STATUS_LABELS[status];
};
