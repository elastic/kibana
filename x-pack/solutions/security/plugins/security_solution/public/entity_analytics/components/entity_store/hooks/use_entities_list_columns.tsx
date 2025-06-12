/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { EuiButtonIcon, EuiIcon, useEuiTheme } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { get } from 'lodash/fp';
import {
  EntityTypeToLevelField,
  EntityTypeToScoreField,
} from '../../../../../common/search_strategy';
import {
  EntityPanelKeyByType,
  EntityPanelParamByType,
} from '../../../../flyout/entity_details/shared/constants';
import { FormattedRelativePreferenceDate } from '../../../../common/components/formatted_date';
import { RiskScoreLevel } from '../../severity/common';
import { getEmptyTagValue } from '../../../../common/components/empty_value';
import type { Columns } from '../../../../explore/components/paginated_table';
import type { Entity } from '../../../../../common/api/entity_analytics/entity_store/entities/common.gen';
import { type CriticalityLevels } from '../../../../../common/constants';
import { ENTITIES_LIST_TABLE_ID } from '../constants';
import { EntityIconByType, getEntityType, sourceFieldToText } from '../helpers';
import { CRITICALITY_LEVEL_TITLE } from '../../asset_criticality/translations';
import { formatRiskScore } from '../../../common';

export type EntitiesListColumns = [
  Columns<Entity>,
  Columns<string, Entity>,
  Columns<string | undefined, Entity>,
  Columns<CriticalityLevels, Entity>,
  Columns<Entity>,
  Columns<Entity>,
  Columns<string, Entity>
];

export const useEntitiesListColumns = (): EntitiesListColumns => {
  const { openRightPanel } = useExpandableFlyoutApi();
  const { euiTheme } = useEuiTheme();

  return [
    {
      name: (
        <FormattedMessage
          id="xpack.securitySolution.entityAnalytics.entityStore.entitiesList.actionsColumn.title"
          defaultMessage="Actions"
        />
      ),

      render: (record: Entity) => {
        const entityType = getEntityType(record);

        const value = record.entity.name;
        const onClick = () => {
          const id = EntityPanelKeyByType[entityType];

          if (id) {
            openRightPanel({
              id,
              params: {
                [EntityPanelParamByType[entityType] ?? '']: value,
                contextID: ENTITIES_LIST_TABLE_ID,
                scopeId: ENTITIES_LIST_TABLE_ID,
              },
            });
          }
        };

        if (!value || !EntityPanelKeyByType[entityType]) {
          return null;
        }

        return (
          <EuiButtonIcon
            iconType="expand"
            onClick={onClick}
            aria-label={i18n.translate(
              'xpack.securitySolution.entityAnalytics.entityStore.entitiesList.entityPreview.ariaLabel',
              {
                defaultMessage: 'Preview entity with name {name}',
                values: { name: value },
              }
            )}
          />
        );
      },
      width: '5%',
    },
    {
      field: 'entity.name',
      name: (
        <FormattedMessage
          id="xpack.securitySolution.entityAnalytics.entityStore.entitiesList.nameColumn.title"
          defaultMessage="Name"
        />
      ),
      sortable: true,
      truncateText: { lines: 2 },
      render: (_: string, record: Entity) => {
        const entityType = getEntityType(record);
        return (
          <span>
            <EuiIcon type={EntityIconByType[entityType]} />
            <span css={{ paddingLeft: euiTheme.size.s }}>{record.entity.name}</span>
          </span>
        );
      },
      width: '25%',
    },
    {
      field: 'entity.source',
      name: (
        <FormattedMessage
          id="xpack.securitySolution.entityAnalytics.entityStore.entitiesList.sourceColumn.title"
          defaultMessage="Source"
        />
      ),
      width: '25%',
      truncateText: { lines: 2 },
      render: (source: string | undefined) => {
        if (source != null) {
          return sourceFieldToText(source);
        }

        return getEmptyTagValue();
      },
    },
    {
      field: 'asset.criticality',
      name: (
        <FormattedMessage
          id="xpack.securitySolution.entityAnalytics.entityStore.entitiesList.criticalityColumn.title"
          defaultMessage="Criticality"
        />
      ),
      width: '10%',
      render: (criticality: CriticalityLevels) => {
        if (criticality != null) {
          return <span>{CRITICALITY_LEVEL_TITLE[criticality]}</span>;
        }

        return getEmptyTagValue();
      },
    },
    {
      name: (
        <FormattedMessage
          id="xpack.securitySolution.entityAnalytics.entityStore.entitiesList.riskScoreColumn.title"
          defaultMessage="Risk score"
        />
      ),
      width: '10%',
      render: (entity: Entity) => {
        const entityType = getEntityType(entity);
        const riskScore = get(EntityTypeToScoreField[entityType], entity);

        if (riskScore != null) {
          return (
            <span data-test-subj="risk-score-truncate" title={`${riskScore}`}>
              {formatRiskScore(riskScore)}
            </span>
          );
        }
        return getEmptyTagValue();
      },
    },
    {
      name: (
        <FormattedMessage
          id="xpack.securitySolution.entityAnalytics.entityStore.entitiesList.riskLevelColumn.title"
          defaultMessage="Risk Level"
        />
      ),
      width: '10%',
      render: (entity: Entity) => {
        const entityType = getEntityType(entity);
        const riskLevel = get(EntityTypeToLevelField[entityType], entity);

        if (riskLevel != null) {
          return <RiskScoreLevel severity={riskLevel} />;
        }
        return getEmptyTagValue();
      },
    },
    {
      field: '@timestamp',
      name: (
        <FormattedMessage
          id="xpack.securitySolution.entityAnalytics.entityStore.entitiesList.lastUpdateColumn.title"
          defaultMessage="Last Update"
        />
      ),
      sortable: true,
      render: (lastUpdate: string) => {
        return <FormattedRelativePreferenceDate value={lastUpdate} />;
      },
      width: '15%',
    },
  ];
};
