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
  EntityPanelIdParamByType,
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

        // entity.name contains the original user.name or host.name value
        // entity.id contains the computed unique identifier
        // We pass entity.name as userName/hostName and entity.id as userId/hostId
        const entityName = record.entity.name;
        const entityId = record.entity.id;
        const onClick = () => {
          const id = EntityPanelKeyByType[entityType];
          if (id) {
            const nameParam = EntityPanelParamByType[entityType];
            const idParam = EntityPanelIdParamByType[entityType];
            openRightPanel({
              id,
              params: {
                ...(nameParam ? { [nameParam]: entityName } : {}),
                ...(idParam ? { [idParam]: entityId } : {}),
                contextID: ENTITIES_LIST_TABLE_ID,
                scopeId: ENTITIES_LIST_TABLE_ID,
              },
            });
          }
        };

        // Only show the expand button if entity.name is available
        // If entity.name is not set, the entity hasn't been processed through the updated pipeline yet
        if (!entityId || !EntityPanelKeyByType[entityType]) {
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
                values: { name: entityName || entityId },
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
        // Display entity.name if available, otherwise show entity.id
        const displayName = record.entity.name || record.entity.id;
        return (
          <span>
            <EuiIcon type={EntityIconByType[entityType]} />
            <span css={{ paddingLeft: euiTheme.size.s }}>{displayName}</span>
          </span>
        );
      },
      width: '20%',
    },
    {
      field: 'entity.id',
      name: (
        <FormattedMessage
          id="xpack.securitySolution.entityAnalytics.entityStore.entitiesList.idColumn.title"
          defaultMessage="ID"
        />
      ),
      sortable: true,
      truncateText: { lines: 2 },
      render: (id: string) => {
        return <span>{id}</span>;
      },
      width: '20%',
    },
    {
      field: 'entity.source',
      name: (
        <FormattedMessage
          id="xpack.securitySolution.entityAnalytics.entityStore.entitiesList.sourceColumn.title"
          defaultMessage="Source"
        />
      ),
      width: '15%',
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
