/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiInMemoryTable } from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { EntityRiskScoreRecord } from '../../../../common/api/entity_analytics/common';
import type { RiskSeverity } from '../../../../common/search_strategy';
import { RiskScoreLevel } from '../severity/common';
import { EntityDetailsLink } from '../../../common/components/links';
import type { EntityType } from '../../../../common/entity_analytics/types';

type RiskScoreColumn = EuiBasicTableColumn<EntityRiskScoreRecord> & {
  field: keyof EntityRiskScoreRecord;
};

export const RiskScorePreviewTable = ({
  items,
  type,
}: {
  items: EntityRiskScoreRecord[];
  type: EntityType;
}) => {
  const columns: RiskScoreColumn[] = [
    {
      field: 'id_value',
      name: (
        <FormattedMessage
          id="xpack.securitySolution.riskScore.previewTable.nameColumnTitle"
          defaultMessage="Name"
        />
      ),
      render: (entityName: string) => (
        <EntityDetailsLink entityName={entityName} entityType={type} />
      ),
    },
    {
      field: 'calculated_level',
      name: (
        <FormattedMessage
          id="xpack.securitySolution.riskScore.previewTable.levelColumnTitle"
          defaultMessage="Level"
        />
      ),

      render: (risk: RiskSeverity | null) => {
        if (risk != null) {
          return <RiskScoreLevel severity={risk} />;
        }

        return '';
      },
    },
    {
      field: 'calculated_score_norm',
      name: (
        <FormattedMessage
          id="xpack.securitySolution.riskScore.previewTable.scoreNormColumnTitle"
          defaultMessage="Score norm"
        />
      ),
      render: (scoreNorm: number | null) => {
        if (scoreNorm != null) {
          return Math.round(scoreNorm * 100) / 100;
        }
        return '';
      },
    },
  ];

  return (
    <EuiInMemoryTable<EntityRiskScoreRecord>
      data-test-subj={`${type}-risk-preview-table`}
      responsiveBreakpoint={false}
      items={items}
      columns={columns}
    />
  );
};
