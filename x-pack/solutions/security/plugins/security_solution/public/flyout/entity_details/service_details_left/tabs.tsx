/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import {
  getInsightsInputTab,
  getRiskInputTab,
  getResolutionGroupTab,
} from '../../../entity_analytics/components/entity_details_flyout';
import { EntityIdentifierFields, EntityType } from '../../../../common/entity_analytics/types';
import { useHasEntityResolutionLicense } from '../../../common/hooks/use_has_entity_resolution_license';
import type { LeftPanelTabsType } from '../shared/components/left_panel/left_panel_header';
import { getGraphViewTab } from '../shared/components/left';

export const useTabs = (
  name: string,
  scopeId: string,
  entityStoreEntityId?: string,
  hasNonClosedAlerts?: boolean,
  entityId?: string
): LeftPanelTabsType => {
  const hasEntityResolutionLicense = useHasEntityResolutionLicense();

  return useMemo(() => {
    const riskTab = [
      getRiskInputTab({
        entityName: name,
        entityType: EntityType.service,
        scopeId,
        entityId: entityStoreEntityId,
      }),
    ];

    // Services only have the alerts insight; misconfigurations and vulnerabilities never apply.
    const insightsTab =
      hasNonClosedAlerts && name
        ? [
            getInsightsInputTab({
              field: EntityIdentifierFields.serviceName,
              value: name,
              entityId: entityId ?? entityStoreEntityId,
              scopeId,
              entityType: EntityType.service,
            }),
          ]
        : [];

    const graphTab = entityStoreEntityId
      ? [getGraphViewTab({ entityId: entityStoreEntityId, scopeId })]
      : [];

    const resolutionTab =
      entityStoreEntityId && hasEntityResolutionLicense
        ? [
            getResolutionGroupTab({
              entityId: entityStoreEntityId,
              entityType: EntityType.service,
              scopeId,
            }),
          ]
        : [];

    return [...riskTab, ...insightsTab, ...graphTab, ...resolutionTab];
  }, [
    name,
    scopeId,
    entityStoreEntityId,
    hasNonClosedAlerts,
    entityId,
    hasEntityResolutionLicense,
  ]);
};
