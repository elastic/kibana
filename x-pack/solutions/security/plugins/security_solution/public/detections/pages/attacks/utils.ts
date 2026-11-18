/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { encodeFlyoutV2UrlParam } from '../../../flyout_v2/shared/url_state/flyout_v2_url_param';

export interface ResolveAttackFlyoutParamsConfig {
  index: string;
  attackId: string;
}

/**
 * Resolves the flyoutV2 URL parameter for the new flyout system.
 * If the URL already carries a flyoutV2 param (e.g. from a prior share link), preserves it.
 * Otherwise encodes an attack descriptor for the given attack.
 */
export const resolveAttackFlyoutV2Params = (
  { index, attackId }: ResolveAttackFlyoutParamsConfig,
  currentParamsString: string | null
): string => {
  if (currentParamsString) {
    return currentParamsString;
  }
  return encodeFlyoutV2UrlParam([{ kind: 'attack', attackId, indexName: index }]);
};
