/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { RiskSeverity } from '../../../../../common/search_strategy';

export interface RiskLevelDatum {
  riskLevel: string;
  range: string;
  entities: number;
}

export const RISK_LEVEL_COLUMN: EuiBasicTableColumn<RiskLevelDatum> = {
  field: 'riskLevel',
  name: i18n.translate(
    'xpack.securitySolution.entityAnalytics.threatHunting.riskLevels.table.riskLevel',
    { defaultMessage: 'Risk level' }
  ),
  width: '40%',
};

export const RANGE_COLUMN: EuiBasicTableColumn<RiskLevelDatum> = {
  field: 'range',
  name: i18n.translate(
    'xpack.securitySolution.entityAnalytics.threatHunting.riskLevels.table.range',
    { defaultMessage: 'Risk score' }
  ),
  width: '25%',
};

export const COUNT_COLUMN: EuiBasicTableColumn<RiskLevelDatum> = {
  field: 'entities',
  name: i18n.translate(
    'xpack.securitySolution.entityAnalytics.threatHunting.riskLevels.table.entities',
    { defaultMessage: 'Number of entities' }
  ),
  dataType: 'number',
  width: '35%',
};

export const RISK_LEVEL_CONFIG: Array<{
  severity: RiskSeverity;
  label: string;
  range: string;
}> = [
  {
    severity: RiskSeverity.Critical,
    label: i18n.translate(
      'xpack.securitySolution.entityAnalytics.threatHunting.riskLevels.critical',
      {
        defaultMessage: 'Critical',
      }
    ),
    range: '> 90',
  },
  {
    severity: RiskSeverity.High,
    label: i18n.translate('xpack.securitySolution.entityAnalytics.threatHunting.riskLevels.high', {
      defaultMessage: 'High',
    }),
    range: '70 - 90',
  },
  {
    severity: RiskSeverity.Moderate,
    label: i18n.translate(
      'xpack.securitySolution.entityAnalytics.threatHunting.riskLevels.medium',
      {
        defaultMessage: 'Medium',
      }
    ),
    range: '40 - 70',
  },
  {
    severity: RiskSeverity.Low,
    label: i18n.translate('xpack.securitySolution.entityAnalytics.threatHunting.riskLevels.low', {
      defaultMessage: 'Low',
    }),
    range: '20 - 40',
  },
  {
    severity: RiskSeverity.Unknown,
    label: i18n.translate(
      'xpack.securitySolution.entityAnalytics.threatHunting.riskLevels.unknown',
      {
        defaultMessage: 'Unknown',
      }
    ),
    range: '< 20',
  },
];
