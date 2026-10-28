/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiHealth, EuiLoadingSpinner, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { LocationAgentStats } from '../../../../../../common/types';

export const LocationHealth = ({
  stats,
  loading = false,
  error = false,
}: {
  stats?: LocationAgentStats;
  loading?: boolean;
  error?: boolean;
}) => {
  if (loading && !stats) {
    return <EuiLoadingSpinner size="s" />;
  }

  if (error && !stats) {
    return (
      <EuiText size="s" color="subdued" data-test-subj="syntheticsLocationHealthError">
        {UNABLE_TO_LOAD_LABEL}
      </EuiText>
    );
  }

  const agents = stats?.agents ?? [];
  if (agents.length === 0) {
    return (
      <EuiText size="s" color="subdued" data-test-subj="syntheticsLocationHealthEmpty">
        {NO_AGENTS_LABEL}
      </EuiText>
    );
  }

  const healthyCount = agents.filter((agent) => agent.healthy).length;
  const color =
    healthyCount === agents.length ? 'success' : healthyCount === 0 ? 'danger' : 'warning';

  return (
    <EuiHealth color={color} data-test-subj="syntheticsLocationHealth">
      {HEALTHY_COUNT_LABEL(healthyCount, agents.length)}
    </EuiHealth>
  );
};

const NO_AGENTS_LABEL = i18n.translate(
  'xpack.synthetics.monitorManagement.locationHealthEmptyLabel',
  {
    defaultMessage: 'No agents',
  }
);

const UNABLE_TO_LOAD_LABEL = i18n.translate(
  'xpack.synthetics.monitorManagement.locationHealthErrorLabel',
  {
    defaultMessage: 'Unable to load',
  }
);

const HEALTHY_COUNT_LABEL = (healthy: number, total: number) =>
  i18n.translate('xpack.synthetics.monitorManagement.locationHealthyCountLabel', {
    defaultMessage: '{healthy}/{total} healthy',
    values: { healthy, total },
  });
