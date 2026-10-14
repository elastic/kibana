/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { SearchInferenceEndpointsPluginStart } from '@kbn/search-inference-endpoints/server';
import type { ProposalsPluginStart } from '@kbn/proposals-plugin/server';
import type { ScopedModel } from '@kbn/agent-builder-server';
import type { HuntModelTierId } from '@kbn/alertzero-common';

/**
 * One resolved model per AlertZero tier. A tier is undefined when it has no usable endpoint,
 * and only the consumers of that tier degrade. There is deliberately no catch-all model, so a
 * consumer cannot quietly run on a tier it never asked for.
 *
 * Which workload runs on which tier is decided in one place, `huntCoordinatorCore`, and the
 * consumers themselves just take a `model`. Recommended placement:
 *  - `efficient`: selection and short grounded text over a small input. Dataset matching picks
 *    names from a list, and recommendations are a few short lines. Both have deterministic
 *    fallbacks, so a small model is enough.
 *  - `balanced`: many tool or model rounds per report, where frontier cost and latency multiply
 *    by the round count. ES|QL generation runs up to `MAX_GENERATED_BEHAVIORS` rounds.
 *  - `frontier`: one pass whose quality bounds everything downstream. Tier 2 technique
 *    extraction decides which behaviors get a query at all.
 */
export type HuntModels = Partial<Record<HuntModelTierId, ScopedModel>>;

/** A tier a hunt consumer can ask for. */
export type HuntModelTier = HuntModelTierId;

/**
 * The two jobs Tier 2 does, named by job rather than tier so moving one to another tier only
 * touches the mapping in `huntCoordinatorCore` and the `hunt_behavior` route.
 */
export interface HuntBehaviorModels {
  /** Reads the report and extracts the ATT&CK behaviors. */
  extraction: ScopedModel;
  /** Generates one grounded ES|QL query per validated behavior. */
  esql: ScopedModel;
}

/**
 * Shared service handles the hunt pipeline (Tier 1, Tier 2, correlation and,
 * eventually, investigation write-back) needs from sibling plugins. Assembled
 * once in AlertZeroPlugin#start and threaded through every hunt route/service
 * so none of them import agentBuilder/inference directly.
 */
export interface HuntServices {
  /** The proposals plugin's service, for writing back hunt proposals. */
  getProposalsService: ProposalsPluginStart['getProposalsService'];
  /**
   * The proposals plugin's privilege checker, for a caller that writes through the service
   * itself rather than through a route or a workflow step, which check it on their own. The
   * service does not: it writes with its own credentials and relies on its callers.
   */
  getProposalPrivileges: ProposalsPluginStart['getProposalPrivileges'];
  /**
   * Inference plugin start contract, for building a ScopedModel per hunt run.
   * Optional plugin, so this is undefined on a deployment without it and the
   * caller degrades at the Tier 2 boundary rather than failing the hunt.
   */
  getInference: () => InferenceServerStart | undefined;
  /**
   * Model-tier registry, for resolving the connector an operator picked for an
   * AlertZero tier. Optional plugin, so hunt routes fall back to the connector
   * chain in `scoped_model.ts` when it is absent.
   */
  getSearchInferenceEndpoints: () => SearchInferenceEndpointsPluginStart | undefined;
}
