/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useMemo } from 'react';
import type { EntityType } from '../../../../common/entity_analytics/types';
import type { EntityRiskScore } from '../../../../common/search_strategy';

/**
 * Optional resolution-group risk record made available to {@link FlyoutRiskSummary} by an
 * ancestor (today: the Agent Builder Preview Only canvas). Used as a fallback when the
 * internal `useRiskScore` lookup against the legacy risk index returns no match — the
 * canvas's data scope cannot match the EUID-shaped `id_value` the legacy index is keyed by,
 * so the host/user/service preview flyout would otherwise hide the
 * "Resolution group risk score" panel even though a resolution group exists.
 *
 * The in-app flyout never wraps the tree with this provider, so its `useResolutionRiskFallback`
 * call returns `undefined` and `FlyoutRiskSummary` keeps the existing "internal risk-index
 * lookup only" behavior.
 */
interface ResolutionRiskFallbackContextValue {
  entityType: EntityType;
  riskScore: EntityRiskScore<EntityType>;
}

const ResolutionRiskFallbackContext = createContext<ResolutionRiskFallbackContextValue | undefined>(
  undefined
);

export interface ResolutionRiskFallbackProviderProps<T extends EntityType> {
  entityType: T;
  /**
   * Resolution-group risk score for the entity panel under this provider, or `undefined`
   * when no fallback is available. The provider always mounts so the consumer's contract
   * stays uniform regardless of fallback availability.
   */
  riskScore: EntityRiskScore<T> | undefined;
  children: React.ReactNode;
}

/**
 * Wraps a host/user/service Preview Only flyout subtree with an optional fallback
 * resolution-group risk record consumable via {@link useResolutionRiskFallback}.
 */
export const ResolutionRiskFallbackProvider = <T extends EntityType>({
  entityType,
  riskScore,
  children,
}: ResolutionRiskFallbackProviderProps<T>) => {
  const value = useMemo<ResolutionRiskFallbackContextValue | undefined>(
    () =>
      riskScore ? { entityType, riskScore: riskScore as EntityRiskScore<EntityType> } : undefined,
    [entityType, riskScore]
  );
  return (
    <ResolutionRiskFallbackContext.Provider value={value}>
      {children}
    </ResolutionRiskFallbackContext.Provider>
  );
};

/**
 * Returns the ancestor-provided resolution-group risk fallback if and only if it was
 * provided for the same `entityType`. Returns `undefined` outside the provider, when no
 * value was provided, or when the provided value targets a different entity type.
 *
 * The entity-type discriminator check guards against mismatched providers (e.g. a service
 * fallback leaking into a user flyout) so the consumer can pass a generic `entityType`
 * without an unsafe runtime cast.
 */
export const useResolutionRiskFallback = <T extends EntityType>(
  entityType: T
): EntityRiskScore<T> | undefined => {
  const ctx = useContext(ResolutionRiskFallbackContext);
  if (!ctx || ctx.entityType !== entityType) {
    return undefined;
  }
  return ctx.riskScore as EntityRiskScore<T>;
};
