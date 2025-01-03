/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { EuiBasicTableColumn } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { sumBy } from 'lodash/fp';

import type { EntityRiskScore, EntityType, RiskStats } from '../../../../common/search_strategy';
import { formatRiskScore } from '../../common';

interface TableItem {
  category: string;
  count: number | undefined;
  score: number;
}

interface EntityData {
  name: string;
  risk: RiskStats;
}

export const columnsArray: Array<EuiBasicTableColumn<TableItem>> = [
  {
    field: 'category',
    name: (
      <FormattedMessage
        id="xpack.securitySolution.flyout.entityDetails.categoryColumnLabel"
        defaultMessage="Category"
      />
    ),
    truncateText: false,
    mobileOptions: { show: true },
    sortable: true,
    footer: (
      <FormattedMessage
        id="xpack.securitySolution.flyout.entityDetails.categoryColumnFooterLabel"
        defaultMessage="Result"
      />
    ),
  },
  {
    field: 'score',
    name: (
      <FormattedMessage
        id="xpack.securitySolution.flyout.entityDetails.scoreColumnLabel"
        defaultMessage="Score"
      />
    ),
    truncateText: false,
    mobileOptions: { show: true },
    sortable: true,
    dataType: 'number',
    align: 'right',
    render: formatRiskScore,
    footer: (props) => (
      <span data-test-subj="risk-summary-result-score">
        {formatRiskScore(sumBy((i) => i.score, props.items))}
      </span>
    ),
  },
  {
    field: 'count',
    name: (
      <FormattedMessage
        id="xpack.securitySolution.flyout.entityDetails.inputsColumnLabel"
        defaultMessage="Inputs"
      />
    ),
    truncateText: false,
    mobileOptions: { show: true },
    sortable: true,
    dataType: 'number',
    align: 'right',
    footer: (props) => (
      <span data-test-subj="risk-summary-result-count">
        {sumBy((i) => i.count ?? 0, props.items)}
      </span>
    ),
  },
];

export const getItems: (entityData: EntityData | undefined) => TableItem[] = (entityData) => {
  return [
    {
      category: i18n.translate('xpack.securitySolution.flyout.entityDetails.alertsGroupLabel', {
        defaultMessage: 'Alerts',
      }),
      score: entityData?.risk.category_1_score ?? 0,
      count: entityData?.risk.category_1_count ?? 0,
    },

    {
      category: i18n.translate(
        'xpack.securitySolution.flyout.entityDetails.assetCriticalityGroupLabel',
        {
          defaultMessage: 'Asset Criticality',
        }
      ),
      score: entityData?.risk.category_2_score ?? 0,
      count: undefined,
    },
  ];
};

export const getEntityData = <T extends EntityType>(
  entityType: T,
  riskData: EntityRiskScore<T> | undefined
): EntityData | undefined => {
  return riskData?.[entityType];
};

export const LENS_VISUALIZATION_HEIGHT = 126; //  Static height in pixels specified by design
export const LENS_VISUALIZATION_MIN_WIDTH = 160; // Lens visualization min-width in pixels
export const SUMMARY_TABLE_MIN_WIDTH = 180; // Summary table min-width in pixels
export const LAST_30_DAYS = { from: 'now-30d', to: 'now' };
