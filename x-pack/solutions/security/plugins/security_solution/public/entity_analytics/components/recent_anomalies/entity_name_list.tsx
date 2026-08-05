/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { EuiFlexGroup, EuiFlexItem, EuiLink, EuiText } from '@elastic/eui';
import { css } from '@emotion/react';
import { getAnomalyChartStyling } from './anomaly_chart_styling';
import type { EntityType } from '../../../../common/entity_analytics/types';
import {
  EntityPanelKeyByType,
  EntityPanelParamByType,
} from '../../../flyout/entity_details/shared/constants';
import type { EntityMetadata } from './hooks/recent_anomalies_query_hooks';

interface EntityNameListProps {
  entities: EntityMetadata[];
  contextId: string;
  compressed?: boolean;
}

export const EntityNameList: React.FC<EntityNameListProps> = ({
  entities,
  contextId,
  compressed = false,
}) => {
  const { openFlyout } = useExpandableFlyoutApi();
  const styling = getAnomalyChartStyling(compressed);

  const openEntityFlyout = (entity: EntityMetadata) => {
    const entityType = entity.entityType as EntityType;
    const panelKey = EntityPanelKeyByType[entityType];
    const paramName = EntityPanelParamByType[entityType];
    if (!panelKey || !paramName) return;

    openFlyout({
      right: {
        id: panelKey,
        params: {
          contextID: contextId,
          [paramName]: entity.entityName,
          entityId: entity.entityId,
          scopeId: contextId,
        },
      },
    });
  };

  return (
    <EuiFlexItem
      css={css`
        margin-top: ${styling.heightOfTopLegend}px;
        height: ${styling.heightOfEntityNamesList(entities.length)}px;
      `}
      grow={false}
    >
      <EuiFlexGroup gutterSize={'none'} direction={'column'} justifyContent={'center'}>
        {entities.map((entity) => (
          <EuiFlexItem
            key={entity.entityId}
            css={css`
              justify-content: center;
              height: ${styling.heightOfEachCell}px;
            `}
            grow={false}
          >
            <EuiText textAlign={'right'} size={'s'}>
              <EuiLink
                onClick={() => {
                  openEntityFlyout(entity);
                }}
              >
                {entity.entityId}
              </EuiLink>
            </EuiText>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </EuiFlexItem>
  );
};
