/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSwitch } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { useSimplifiedMetrics } from '../../../entity_analytics/components/home/facelift/v8/active_metrics_version';

const LABEL = i18n.translate(
  'xpack.securitySolution.globalHeader.faceliftSimplifiedMetricsLabel',
  { defaultMessage: 'Simplified metrics' }
);

/**
 * Compact chrome switch (v.8 only) that picks the metrics track: off = full
 * cards (charts + deltas), on = simplified cards. Each track has its own
 * Metrics version list.
 */
export const SimplifiedMetricsHeaderControl: React.FC = () => {
  const [simplified, setSimplified] = useSimplifiedMetrics();

  return (
    <EuiSwitch
      compressed
      label={LABEL}
      checked={simplified}
      onChange={(event) => setSimplified(event.target.checked)}
      data-test-subj="eaFaceliftSimplifiedMetricsSwitch"
    />
  );
};
