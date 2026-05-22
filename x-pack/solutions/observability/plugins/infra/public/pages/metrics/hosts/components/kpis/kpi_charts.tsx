/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// P15b — the Hosts page KPI strip now consumes the single
// `/api/metrics/infra/host/kpis` endpoint via `<HostKpiTiles>` instead of
// fanning out into four Lens-driven DSL queries. Visual contract (header /
// value / subtitle / tooltip) is preserved; the trend line was already
// removed in P15a.
//
// `getSubtitle` is kept exported because legacy tests still import it
// to assert the subtitle copy logic for the host count tile.

import React from 'react';
import { i18n } from '@kbn/i18n';
import { HostKpiTiles } from './host_kpi_tiles';
import { LegacyKpiCharts } from './legacy_kpi_charts';
import { usePocSettingsContext } from '../../hooks/use_poc_settings';
import {
  MAX_AS_FIRST_FUNCTION_PATTERN,
  AVG_OR_AVERAGE_AS_FIRST_FUNCTION_PATTERN,
} from '../../../../../components/asset_details/constants';

export const getSubtitle = ({
  formulaValue,
  limit,
  hostCount,
}: {
  formulaValue: string;
  limit: number;
  hostCount: number;
}) => {
  // Check if 'max' is the first word/function in the formula
  // Handles: "max(...)", "1 - max(...)", "100 * max(...)", etc.
  if (MAX_AS_FIRST_FUNCTION_PATTERN.test(formulaValue)) {
    return limit < hostCount
      ? i18n.translate('xpack.infra.hostsViewPage.kpi.subtitle.max.limit', {
          defaultMessage: 'Max (of {limit} hosts)',
          values: {
            limit,
          },
        })
      : i18n.translate('xpack.infra.hostsViewPage.kpi.subtitle.max', {
          defaultMessage: 'Max',
        });
  }
  if (AVG_OR_AVERAGE_AS_FIRST_FUNCTION_PATTERN.test(formulaValue)) {
    return limit < hostCount
      ? i18n.translate('xpack.infra.hostsViewPage.kpi.subtitle.average.limit', {
          defaultMessage: 'Average (of {limit} hosts)',
          values: {
            limit,
          },
        })
      : i18n.translate('xpack.infra.hostsViewPage.kpi.subtitle.average', {
          defaultMessage: 'Average',
        });
  }
  return limit < hostCount
    ? i18n.translate('xpack.infra.hostsViewPage.kpi.subtitle.average.limit', {
        defaultMessage: 'of {limit} hosts',
        values: {
          limit,
        },
      })
    : '';
};

export const KpiCharts = () => {
  const { useNewKpis } = usePocSettingsContext();
  return useNewKpis ? <HostKpiTiles /> : <LegacyKpiCharts />;
};
