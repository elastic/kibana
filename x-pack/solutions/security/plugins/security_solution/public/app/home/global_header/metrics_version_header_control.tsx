/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';

import { useActiveFaceliftVersion } from '../../../entity_analytics/components/home/facelift/active_version';
import {
  METRICS_VERSION_OPTIONS as METRICS_VERSION_OPTIONS_V6,
  useActiveMetricsVersion as useActiveMetricsVersionV6,
} from '../../../entity_analytics/components/home/facelift/active_metrics_version';
import {
  METRICS_VERSION_OPTIONS as METRICS_VERSION_OPTIONS_V7,
  useActiveMetricsVersion as useActiveMetricsVersionV7,
} from '../../../entity_analytics/components/home/facelift/v7/active_metrics_version';
import { FaceliftHeaderVersionSelect } from './facelift_header_version_select';

const LABEL = i18n.translate('xpack.securitySolution.globalHeader.faceliftMetricsVersionLabel', {
  defaultMessage: 'Metrics version:',
});

const SELECT_ARIA_LABEL = i18n.translate(
  'xpack.securitySolution.globalHeader.faceliftMetricsVersionAriaLabel',
  { defaultMessage: 'Metrics version' }
);

/** Prototype v.6 metrics state: the full v.1–v.7 chart history. */
const MetricsVersionSelectV6: React.FC = () => {
  const [metricsVersion, setMetricsVersion] = useActiveMetricsVersionV6();

  return (
    <FaceliftHeaderVersionSelect
      label={LABEL}
      ariaLabel={SELECT_ARIA_LABEL}
      options={METRICS_VERSION_OPTIONS_V6}
      value={metricsVersion}
      onChange={setMetricsVersion}
      testIdPrefix="eaMetricsVersion"
    />
  );
};

/** Prototype v.7 metrics state: v.7 is the only chart layout it carries. */
const MetricsVersionSelectV7: React.FC = () => {
  const [metricsVersion, setMetricsVersion] = useActiveMetricsVersionV7();

  return (
    <FaceliftHeaderVersionSelect
      label={LABEL}
      ariaLabel={SELECT_ARIA_LABEL}
      options={METRICS_VERSION_OPTIONS_V7}
      value={metricsVersion}
      onChange={setMetricsVersion}
      testIdPrefix="eaMetricsVersion"
    />
  );
};

/**
 * Metrics-charts version within the active prototype (chrome header, left of
 * Prototype version). Only mounted for prototypes that ship a metrics switch,
 * and reads that prototype's own isolated metrics state.
 */
export const MetricsVersionHeaderControl: React.FC = () => {
  const [faceliftVersion] = useActiveFaceliftVersion();

  return faceliftVersion === 'v7' ? <MetricsVersionSelectV7 /> : <MetricsVersionSelectV6 />;
};
