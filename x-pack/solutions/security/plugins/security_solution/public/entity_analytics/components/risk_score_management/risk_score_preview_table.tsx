/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiInMemoryTable, EuiLink } from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { EntityRiskScoreRecord } from '../../../../common/api/entity_analytics/common';
import type { RiskSeverity } from '../../../../common/search_strategy';
import { RiskScoreLevel } from '../severity/common';
import { EntityDetailsLink } from '../../../common/components/links';
import type { EntityType } from '../../../../common/entity_analytics/types';
import {
  EntityPanelKeyByType,
  EntityPanelParamByType,
} from '../../../flyout/entity_details/shared/constants';

type RiskScoreColumn = EuiBasicTableColumn<EntityRiskScoreRecord> & {
  field: keyof EntityRiskScoreRecord;
};

const PREVIEW_TABLE_SCOPE_ID = 'risk-score-preview';

const EntityFlyoutLink = ({
  entityId,
  displayName,
  entityType,
}: {
  entityId: string;
  displayName: string;
  entityType: EntityType;
}) => {
  const { openRightPanel } = useExpandableFlyoutApi();
  const panelKey = EntityPanelKeyByType[entityType];
  const paramName = EntityPanelParamByType[entityType];

  const onClick = useCallback(() => {
    if (panelKey && paramName) {
      openRightPanel({
        id: panelKey,
        params: {
          [paramName]: displayName,
          contextID: PREVIEW_TABLE_SCOPE_ID,
          scopeId: PREVIEW_TABLE_SCOPE_ID,
          entityId,
        },
      });
    }
  }, [openRightPanel, panelKey, paramName, displayName, entityId]);

  if (!panelKey) {
    return <>{displayName}</>;
  }

  return <EuiLink onClick={onClick}>{displayName}</EuiLink>;
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
      render: (idValue: string, record: EntityRiskScoreRecord) => {
        if (record.id_field === 'entity.id') {
          return <EntityFlyoutLink entityId={idValue} displayName={idValue} entityType={type} />;
        }
        return <EntityDetailsLink entityName={idValue} entityType={type} />;
      },
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
      tableCaption={i18n.translate('xpack.securitySolution.riskScore.previewTable.caption', {
        defaultMessage: 'Entity risk score preview',
      })}
    />
  );
};
