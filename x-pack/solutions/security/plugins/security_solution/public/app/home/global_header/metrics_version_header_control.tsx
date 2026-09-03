/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';

import {
  METRICS_VERSION_OPTIONS,
  useActiveMetricsVersion,
} from '../../../entity_analytics/components/home/facelift/active_metrics_version';
import { FaceliftHeaderVersionSelect } from './facelift_header_version_select';

const LABEL = i18n.translate('xpack.securitySolution.globalHeader.faceliftMetricsVersionLabel', {
  defaultMessage: 'Metrics version:',
});

const SELECT_ARIA_LABEL = i18n.translate(
  'xpack.securitySolution.globalHeader.faceliftMetricsVersionAriaLabel',
  { defaultMessage: 'Metrics version' }
);

/**
 * Metrics-charts version within prototype v.6 (chrome header, left of Prototype version).
 * Only mounted when the active prototype is v.6.
 */
export const MetricsVersionHeaderControl: React.FC = () => {
  const [metricsVersion, setMetricsVersion] = useActiveMetricsVersion();

  return (
    <FaceliftHeaderVersionSelect
      label={LABEL}
      ariaLabel={SELECT_ARIA_LABEL}
      options={METRICS_VERSION_OPTIONS}
      value={metricsVersion}
      onChange={setMetricsVersion}
      testIdPrefix="eaMetricsVersion"
    />
  );
};
