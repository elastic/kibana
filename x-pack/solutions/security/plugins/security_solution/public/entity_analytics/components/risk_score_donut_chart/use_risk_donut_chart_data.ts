/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { sum } from 'lodash/fp';
import { useMemo } from 'react';
import { RISK_SEVERITY_COLOUR } from '../../common/utils';
import type { LegendItem } from '../../../common/components/charts/legend_item';
import type { SeverityCount } from '../severity/types';
import type { DonutChartProps } from '../../../common/components/charts/donutchart';
import type { RiskSeverity } from '../../../../common/search_strategy';

const legendField = 'kibana.alert.severity';

export const useRiskDonutChartData = (
  severityCount: SeverityCount
): [DonutChartProps['data'], LegendItem[], number] => {
  const [donutChartData, legendItems, total] = useMemo(() => {
    const severities = Object.keys(RISK_SEVERITY_COLOUR) as RiskSeverity[];
    // TODO: Borealis theme migration, when severity palette agreed, update RISK_SEVERITY_COLOUR to use shared hook from security colors:
    // https://github.com/elastic/security-team/issues/11516 hook - https://github.com/elastic/kibana/pull/206276
    return [
      severities.map((status) => ({
        key: status,
        value: severityCount[status],
      })),
      severities.map((status) => ({
        color: RISK_SEVERITY_COLOUR[status],
        field: legendField,
        value: status,
      })),
      sum(Object.values(severityCount)),
    ];
  }, [severityCount]);

  return [donutChartData, legendItems, total];
};
