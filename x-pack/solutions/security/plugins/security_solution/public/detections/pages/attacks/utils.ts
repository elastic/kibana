/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AttackDetailsRightPanelKey } from '../../../flyout/attack_details/constants/panel_keys';
import {
  expandableFlyoutStateRightPanelOnly,
  resolveFlyoutUrlParam,
} from '../../../flyout/shared/utils/expandable_flyout_url_state';

export interface ResolveAttackFlyoutParamsConfig {
  index: string;
  attackId: string;
}

/**
 * Resolves url parameters for the attack details flyout, serialized as rison.
 * Preserves existing flyout query when present (e.g. user opened a share link that already encoded flyout state).
 */
export const resolveAttackFlyoutParams = (
  { index, attackId }: ResolveAttackFlyoutParamsConfig,
  currentParamsString: string | null
) =>
  resolveFlyoutUrlParam(
    currentParamsString,
    expandableFlyoutStateRightPanelOnly({
      id: AttackDetailsRightPanelKey,
      params: {
        attackId,
        indexName: index,
      },
    })
  );
