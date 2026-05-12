/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { getFieldValue } from '@kbn/discover-utils';
import { FlyoutLoading } from '../../shared/components/flyout_loading';
import { FlyoutError } from '../../shared/components/flyout_error';
import { useSpaceId } from '../../../common/hooks/use_space_id';
import { useAttackDetails } from '../../../flyout/attack_details/hooks/use_attack_details';
// Legacy attack-details context is reused so that the presentation-agnostic
// hooks under `flyout/attack_details/hooks/` (which read the legacy context)
// see the same provider as the v2 components. Both surfaces resolve the same
// React.Context object — only the host component (legacy vs. v2 provider)
// differs. The legacy module exposes both the React.Context object and its
// value-shape type under the same `AttackDetailsContext` name (declaration
// merging); we alias the type to the v2-friendly name.
import {
  AttackDetailsContext as LegacyAttackDetailsContext,
  useAttackDetailsContext as useLegacyAttackDetailsContext,
} from '../../../flyout/attack_details/context';

export type AttackDetailsContextValue = LegacyAttackDetailsContext;

/**
 * The v2 surface re-uses the legacy {@link LegacyAttackDetailsContext} so that
 * legacy hooks (e.g. `useOriginalAlertIds`, `useHeaderData`) imported from
 * `flyout/attack_details/hooks/` resolve the same provider as v2 components.
 */
export const AttackDetailsContext = LegacyAttackDetailsContext;

export interface AttackDetailsProviderProps {
  /**
   * The document hit corresponding to the attack-discovery alert opened in
   * the v2 document flyout. The provider derives `attackId` and `indexName`
   * from this hit so the v2 surface does not need to thread the legacy
   * `params` panel-key payload.
   */
  hit: DataTableRecord;
  /**
   * React subtree rendered when the attack data has resolved.
   */
  children: React.ReactNode;
}

/**
 * v2 provider for the attack-details flyout. Mirrors the legacy provider in
 * `flyout/attack_details/context.tsx` minus the expandable-flyout-specific
 * `isPreviewMode` flag, and reuses the presentation-agnostic
 * {@link useAttackDetails} hook from the legacy implementation per the
 * spec's hooks-reuse exception.
 */
export const AttackDetailsProvider = memo(({ hit, children }: AttackDetailsProviderProps) => {
  const attackId = hit.id;
  const indexName = useMemo(
    () => hit.raw._index ?? (getFieldValue(hit, '_index') as string) ?? '',
    [hit]
  );
  const scopeId = useSpaceId() ?? '';

  const {
    attack,
    browserFields,
    dataFormattedForFieldBrowser,
    searchHit,
    getFieldsData,
    loading,
    refetch,
  } = useAttackDetails({ attackId, indexName });

  const contextValue = useMemo<AttackDetailsContextValue | undefined>(
    () =>
      attackId && attack && browserFields && dataFormattedForFieldBrowser && indexName && searchHit
        ? {
            attackId,
            attack,
            browserFields,
            indexName,
            scopeId,
            // v2 has no preview surface; legacy hooks (e.g. assignees/status)
            // read this flag from the shared context — always false here.
            isPreviewMode: false,
            searchHit,
            getFieldsData,
            dataFormattedForFieldBrowser,
            refetch,
          }
        : undefined,
    [
      attackId,
      attack,
      browserFields,
      indexName,
      scopeId,
      dataFormattedForFieldBrowser,
      searchHit,
      getFieldsData,
      refetch,
    ]
  );

  if (loading) {
    return <FlyoutLoading />;
  }

  if (!contextValue) {
    return <FlyoutError />;
  }

  return (
    <AttackDetailsContext.Provider value={contextValue}>{children}</AttackDetailsContext.Provider>
  );
});

AttackDetailsProvider.displayName = 'AttackDetailsProvider';

/**
 * Reads the shared (legacy + v2) attack-details context. Delegates to the
 * legacy hook so both legacy and v2 callers resolve the exact same provider.
 */
export const useAttackDetailsContext = (): AttackDetailsContextValue =>
  useLegacyAttackDetailsContext();
