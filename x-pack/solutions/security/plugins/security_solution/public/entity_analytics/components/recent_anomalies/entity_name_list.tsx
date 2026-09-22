/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLink, EuiText } from '@elastic/eui';
import { css } from '@emotion/react';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { getAnomalyChartStyling } from './anomaly_chart_styling';
import type { EntityType } from '../../../../common/entity_analytics/types';
import {
  EntityPanelKeyByType,
  EntityPanelParamByType,
} from '../../../flyout/entity_details/shared/constants';
import { useIsNewFlyoutEnabled } from '../../../common/hooks/use_is_new_flyout_enabled';
import { FLYOUT_ORIGIN } from '../../../common/lib/telemetry';
import { useFlyoutApi } from '../../../flyout_v2/use_flyout_api';
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
  const enableNewFlyout = useIsNewFlyoutEnabled();
  const { openFlyout } = useExpandableFlyoutApi();
  const { openEntityFlyout } = useFlyoutApi();
  const styling = getAnomalyChartStyling(compressed);

  const handleOpenEntityFlyout = (entity: EntityMetadata) => {
    const entityType = entity.entityType as EntityType;
    const sharedParams = {
      entityId: entity.entityId,
      contextID: contextId,
      scopeId: contextId,
    };

    if (enableNewFlyout) {
      openEntityFlyout({
        engineType: entityType,
        entityName: entity.entityName,
        origin: FLYOUT_ORIGIN.RECENT_ANOMALIES,
        ...sharedParams,
      });
      return;
    }

    const panelKey = EntityPanelKeyByType[entityType];
    const paramName = EntityPanelParamByType[entityType];
    if (panelKey && paramName) {
      openFlyout({
        right: { id: panelKey, params: { [paramName]: entity.entityName, ...sharedParams } },
      });
    }
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
                  handleOpenEntityFlyout(entity);
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
