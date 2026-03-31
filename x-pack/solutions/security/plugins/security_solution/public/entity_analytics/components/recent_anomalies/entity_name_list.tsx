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
import { EntityType } from '../../../../common/entity_analytics/types';
import {
  EntityPanelKeyByType,
  EntityPanelParamByType,
} from '../../../flyout/entity_details/shared/constants';

interface EntityNameListProps {
  entityIds: string[];
  contextId: string;
  compressed?: boolean;
}

const ENTITY_TYPE_PREFIXES: Array<{ prefix: string; type: EntityType }> = [
  { prefix: 'user:', type: EntityType.user },
  { prefix: 'host:', type: EntityType.host },
  { prefix: 'service:', type: EntityType.service },
];

const parseEntityId = (
  entityId: string
): { entityType: EntityType; entityName: string } | undefined => {
  for (const { prefix, type } of ENTITY_TYPE_PREFIXES) {
    if (entityId.startsWith(prefix)) {
      return { entityType: type, entityName: entityId.slice(prefix.length) };
    }
  }
  return undefined;
};

export const EntityNameList: React.FC<EntityNameListProps> = ({
  entityIds,
  contextId,
  compressed = false,
}) => {
  const { openFlyout } = useExpandableFlyoutApi();
  const styling = getAnomalyChartStyling(compressed);

  const openEntityFlyout = (entityId: string) => {
    const parsed = parseEntityId(entityId);
    if (!parsed) return;

    const panelKey = EntityPanelKeyByType[parsed.entityType];
    const paramName = EntityPanelParamByType[parsed.entityType];
    if (!panelKey || !paramName) return;

    openFlyout({
      right: {
        id: panelKey,
        params: {
          contextID: contextId,
          [paramName]: parsed.entityName,
          scopeId: contextId,
        },
      },
    });
  };

  return (
    <EuiFlexItem
      css={css`
        margin-top: ${styling.heightOfTopLegend}px;
        height: ${styling.heightOfEntityNamesList(entityIds)}px;
      `}
      grow={false}
    >
      <EuiFlexGroup gutterSize={'none'} direction={'column'} justifyContent={'center'}>
        {entityIds.map((entityId) => (
          <EuiFlexItem
            key={entityId}
            css={css`
              justify-content: center;
              height: ${styling.heightOfEachCell}px;
            `}
            grow={false}
          >
            <EuiText textAlign={'right'} size={'s'}>
              <EuiLink
                onClick={() => {
                  openEntityFlyout(entityId);
                }}
              >
                {entityId}
              </EuiLink>
            </EuiText>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </EuiFlexItem>
  );
};
