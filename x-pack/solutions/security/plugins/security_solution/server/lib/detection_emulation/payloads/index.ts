/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ResponseActionAgentType,
  ResponseActionsApiCommandNames,
} from '../../../../common/endpoint/service/response_actions/constants';
import rawPayloads from './payloads.json';

export interface EmulationPayload {
  /** ATT&CK technique or sub-technique ID, e.g. "T1059.001". */
  techniqueId: string;
  /** Human-readable label used in scenario descriptions and reports. */
  name: string;
  /** EDR agent types that support this payload's `command`. */
  agentTypes: ResponseActionAgentType[];
  /** Response action command dispatched to the target endpoint. */
  command: ResponseActionsApiCommandNames;
  /** Command-specific parameters forwarded verbatim to the runner. */
  parameters: Record<string, unknown> | null;
  /** Elastic prebuilt rule names expected to fire for this technique. */
  expectedSignals: string[];
}

export const PAYLOAD_LIBRARY_MAX_ENTRIES = 15;

export const payloadLibrary: readonly EmulationPayload[] = rawPayloads as EmulationPayload[];

/**
 * Returns the subset of payloads whose `techniqueId` is in `ids`.
 * Preserves the original library order; unknown IDs are silently skipped.
 */
export const findByTechniqueIds = (ids: string[]): EmulationPayload[] => {
  const idSet = new Set(ids);
  return payloadLibrary.filter((p) => idSet.has(p.techniqueId));
};
