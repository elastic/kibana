/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { EffectScopeProps } from '../components/effect_scope';
import type { ArtifactInfo, MenuItemPropsByPolicyId } from '../types';
import type { ContextMenuItemNavByRouterProps } from '../../context_menu_with_router_support/context_menu_item_nav_by_router';

/**
 * creates the policy links for each policy listed in the artifact record by grabbing the
 * navigation data from the `policies` prop (if any)
 */
export const usePolicyNavLinks = (
  artifact: ArtifactInfo,
  policies?: MenuItemPropsByPolicyId
): ContextMenuItemNavByRouterProps[] | undefined => {
  return useMemo<EffectScopeProps['policies']>(() => {
    return artifact.effectScope.type === 'policy'
      ? artifact?.effectScope.policies.map((id) => {
          return policies && policies[id]
            ? policies[id]
            : // else, unable to build a nav link, so just show id
              {
                children: id,
              };
        })
      : undefined;
  }, [artifact.effectScope, policies]);
};
