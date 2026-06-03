/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import {
  getBehavioralAnomaliesTab,
  getBehavioralAnomaliesV2Tab,
  getRiskInputTab,
  getResolutionGroupTab,
} from '../../../entity_analytics/components/entity_details_flyout';
import { EntityType } from '../../../../common/entity_analytics/types';
import { useHasEntityResolutionLicense } from '../../../common/hooks/use_has_entity_resolution_license';
import type { LeftPanelTabsType } from '../shared/components/left_panel/left_panel_header';
import { getGraphViewTab } from '../shared/components/left';

export const useTabs = (
  name: string,
  scopeId: string,
  entityStoreEntityId?: string
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

    const behavioralAnomaliesTab = [getBehavioralAnomaliesTab()];
    // Prototype: BA-v.2 is a second design version of the behavioral anomalies
    // tab shown alongside the original. Remove this line (and the import) to
    // drop v2.
    const behavioralAnomaliesV2Tab = [getBehavioralAnomaliesV2Tab()];

    return [
      ...riskTab,
      ...behavioralAnomaliesTab,
      ...behavioralAnomaliesV2Tab,
      ...graphTab,
      ...resolutionTab,
    ];
  }, [name, scopeId, entityStoreEntityId, hasEntityResolutionLicense]);
};
