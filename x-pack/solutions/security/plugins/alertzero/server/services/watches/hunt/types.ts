/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { SearchInferenceEndpointsPluginStart } from '@kbn/search-inference-endpoints/server';
import type { ProposalsPluginStart } from '@kbn/proposals-plugin/server';
import type { MitreAttackDataClient } from '@kbn/mitre-attack-plugin/server';
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
 *  - `balanced`: no hunt consumer. ES|QL generation ran here briefly, but Claude Sonnet 5 on
 *    EIS refuses the hunt's generation prompt (the provider content filter ends the response
 *    with nothing written) for nearly every behavior of a threat report, so the tier is not
 *    resolved for hunts.
 *  - `frontier`: one pass whose quality bounds everything downstream. Tier 2 technique
 *    extraction decides which behaviors get a query at all, and ES|QL generation runs here
 *    too: up to `MAX_GENERATED_BEHAVIORS` rounds per report, which is what the hunt paid
 *    before the tiers were split.
 *  - `cyber`: the connector saved on Cyber domain models, when that row is not empty.
 *    Dataset matching, recommendations, and technique extraction prefer it. ES|QL
 *    generation prefers it only when the connector accepts messages; a template-required
 *    endpoint stays off that path because `generateEsql` writes its own prompts.
 */
export interface HuntModels extends Partial<Record<HuntModelTierId, ScopedModel>> {
  cyber?: ScopedModel;
}

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
  /**
   * MITRE data client instance, for the Tier 2 technique catalog (pinned to ATT&CK Enterprise).
   * Undefined when the optional mitreAttack plugin is disabled or its managed source is off,
   * in which case Tier 2 sees an empty catalog, returns early before extraction, and reports a
   * report-level `catalog_unavailable`.
   */
  mitreDataClient?: MitreAttackDataClient;
}
