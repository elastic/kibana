/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import {
  RiskEngineStatusEnum,
  type RiskEngineStatus,
} from '../../../../common/api/entity_analytics/risk_engine/engine_status_route.gen';
import { useRiskEngineStatus } from '../../api/hooks/use_risk_engine_status';
import type { RiskScoreStatusFacts, RiskScoreStatusReason } from './types';

interface UseRiskScoreStatusOptions {
  /**
   * Whether the caller's data fetch returned an empty result (zero scored
   * entities). The hook cannot determine this on its own — only the caller
   * knows whether its specific query yielded rows.
   */
  isResultEmpty?: boolean;
  /**
   * Skip the engine-status fetch (e.g. while a parent feature-flag is still
   * resolving). When `true` the hook returns `unknown` and `isLoading: true`.
   */
  skip?: boolean;
  /**
   * Optional facts to merge into the returned `facts` object. Useful when the
   * caller already has values like `entitiesTracked` from its own query and
   * wants them displayed in the panel.
   */
  facts?: RiskScoreStatusFacts;
}

export interface UseRiskScoreStatusResult {
  reason: RiskScoreStatusReason;
  facts: RiskScoreStatusFacts;
  isLoading: boolean;
}

/**
 * Computes which {@link RiskScoreStatusReason} applies for a risk-score
 * surface, based on engine status plus a caller-supplied "is the data empty?"
 * signal.
 *
 * Intentionally narrow: this hook only distinguishes the reasons we can
 * reliably infer from public API surfaces today
 * (`engine_not_installed`, `engine_disabled`, `no_matching_alerts`,
 * `unknown`). License / privilege / feature-flag gating already has dedicated
 * callout components elsewhere and is out of scope here.
 *
 * The `engine_never_run` reason is reserved for a follow-up when the status
 * endpoint exposes a `lastSuccessTimestamp` field — right now there's no way
 * to distinguish "enabled but never produced output" from "enabled and the
 * current configuration just doesn't match any alerts" without that data.
 */
export const useRiskScoreStatus = (
  options: UseRiskScoreStatusOptions = {}
): UseRiskScoreStatusResult => {
  const { isResultEmpty, skip, facts: callerFacts } = options;
  const { data: engineStatus, isLoading: isEngineStatusLoading } = useRiskEngineStatus(
    skip ? { refetchInterval: false } : {}
  );

  return useMemo<UseRiskScoreStatusResult>(() => {
    const facts: RiskScoreStatusFacts = { ...callerFacts };

    if (skip || isEngineStatusLoading) {
      return { reason: 'unknown', facts, isLoading: true };
    }

    const status: RiskEngineStatus | undefined = engineStatus?.risk_engine_status;

    if (status === RiskEngineStatusEnum.NOT_INSTALLED) {
      return { reason: 'engine_not_installed', facts, isLoading: false };
    }

    if (status === RiskEngineStatusEnum.DISABLED) {
      return { reason: 'engine_disabled', facts, isLoading: false };
    }

    if (status === RiskEngineStatusEnum.ENABLED && isResultEmpty === true) {
      return { reason: 'no_matching_alerts', facts, isLoading: false };
    }

    return { reason: 'unknown', facts, isLoading: false };
  }, [skip, isEngineStatusLoading, engineStatus, isResultEmpty, callerFacts]);
};
