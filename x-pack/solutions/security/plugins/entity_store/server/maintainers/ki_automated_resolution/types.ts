/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityMaintainerState } from '../../tasks/entity_maintainers/types';

export interface KiAutomatedResolutionState extends EntityMaintainerState {
  lastRun: {
    /** Distinct identity-link clues loaded from KI entity features this run. */
    cluesLoaded: number;
    /** Identity-link rules loaded from KI entity features this run (deterministic path). */
    rulesLoaded: number;
    /** Deterministic clues materialized by executing rules over their streams this run. */
    deterministicCluesExtracted: number;
    /** Alias entities linked to a high-confidence target this run (all classes). */
    resolutionsCreated: number;
    /** Subset of `resolutionsCreated` that were IdP -> IdP (high candidate) links. */
    idpResolutionsCreated: number;
    /** Usernames skipped because the same token mapped to multiple emails. */
    skippedAmbiguous: number;
    /** Clues skipped because no high-confidence IdP target matched the email. */
    skippedNoTarget: number;
    /** Clues skipped because no candidate matched the username. */
    skippedNoCandidate: number;
    /** High candidates skipped because their namespace ranked equal/higher than the target. */
    skippedWrongDirection: number;
    /** Clues whose link write threw. */
    failed: number;
  } | null;
}
