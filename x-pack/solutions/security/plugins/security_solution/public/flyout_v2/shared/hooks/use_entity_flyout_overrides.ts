/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { EntityType } from '../../../../common/entity_analytics/types';
import { CspInsightLeftPanelSubTab } from '../../../flyout/entity_details/shared/components/left_panel/left_panel_header';
import type {
  EntitySectionOverrideBuilders,
  EntitySectionOverrides,
} from '../../../flyout/document_details/left/components/entities_details';

/**
 * The hook always provides both builders; callers can spread directly without
 * null-guarding even though the underlying `EntitySectionOverrideBuilders` type
 * marks them optional (to support partial overrides in other contexts).
 */
type RequiredEntitySectionOverrideBuilders = Required<EntitySectionOverrideBuilders>;
import { OpenFlyoutLink } from '../components/open_flyout_link';
import { useEntityFlyoutApi } from '../../entity/use_entity_flyout_api';

export interface UseEntityFlyoutOverridesParams {
  scopeId: string;
  /**
   * The source document. Omit for the attack Entities tool (which has no single
   * representative document — it aggregates across many alerts).
   */
  hit?: DataTableRecord;
}

/**
 * Returns `buildUserOverrides` and `buildHostOverrides` — the two override builder
 * callbacks consumed by the v2 Entities tools. Both builders produce an
 * `EntitySectionOverrides` object (`{ onPreviewEntity, onShowDetailsPanel, linkRenderer }`)
 * that is forwarded to `HostDetails`/`UserDetails`, wiring the v2 system-flyout API in
 * place of the default expandable-flyout fallbacks.
 *
 * Used by both `flyout_v2/document/tools/entities` and `flyout_v2/attack/tools/entities`
 * so that the callback logic has a single source of truth.
 */
export const useEntityFlyoutOverrides = ({
  scopeId,
  hit,
}: UseEntityFlyoutOverridesParams): RequiredEntitySectionOverrideBuilders => {
  const {
    openUserFlyoutAsChild,
    openHostFlyoutAsChild,
    openEntityAlertsInsights,
    openEntityMisconfigurationInsights,
    openEntityVulnerabilityInsights,
  } = useEntityFlyoutApi();

  const buildUserOverrides = useCallback(
    ({ name, entityId }: { name: string; entityId?: string }): EntitySectionOverrides => ({
      onPreviewEntity: () => openUserFlyoutAsChild({ userName: name, entityId, scopeId, hit }),
      onShowDetailsPanel: (subTab) => {
        switch (subTab) {
          case CspInsightLeftPanelSubTab.ALERTS:
            return openEntityAlertsInsights({ entityType: EntityType.user, value: name, entityId });
          case CspInsightLeftPanelSubTab.MISCONFIGURATIONS:
            return openEntityMisconfigurationInsights({
              entityType: EntityType.user,
              value: name,
              entityId,
            });
        }
      },
      linkRenderer: OpenFlyoutLink,
    }),
    [
      openUserFlyoutAsChild,
      openEntityAlertsInsights,
      openEntityMisconfigurationInsights,
      scopeId,
      hit,
    ]
  );

  const buildHostOverrides = useCallback(
    ({ name, entityId }: { name: string; entityId?: string }): EntitySectionOverrides => ({
      onPreviewEntity: () => openHostFlyoutAsChild({ hostName: name, entityId, scopeId, hit }),
      onShowDetailsPanel: (subTab) => {
        switch (subTab) {
          case CspInsightLeftPanelSubTab.ALERTS:
            return openEntityAlertsInsights({ entityType: EntityType.host, value: name, entityId });
          case CspInsightLeftPanelSubTab.MISCONFIGURATIONS:
            return openEntityMisconfigurationInsights({
              entityType: EntityType.host,
              value: name,
              entityId,
            });
          case CspInsightLeftPanelSubTab.VULNERABILITIES:
            return openEntityVulnerabilityInsights({
              value: name,
              entityId,
              onShowHost: () => openHostFlyoutAsChild({ hostName: name, entityId, scopeId, hit }),
            });
        }
      },
      linkRenderer: OpenFlyoutLink,
    }),
    [
      openHostFlyoutAsChild,
      openEntityAlertsInsights,
      openEntityMisconfigurationInsights,
      openEntityVulnerabilityInsights,
      scopeId,
      hit,
    ]
  );

  return useMemo<RequiredEntitySectionOverrideBuilders>(
    () => ({ buildUserOverrides, buildHostOverrides }),
    [buildUserOverrides, buildHostOverrides]
  );
};
