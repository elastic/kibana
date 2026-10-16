/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecurityPutRoleRequest } from '@elastic/elasticsearch/lib/api/types';
import { CORTEX_AI_INDEX_DEST } from '../../../common/cortex';
import { DECISION_TREE_AI_INDEX_DEST } from '../../../common/decision_trees';
import { MEMORY_INDEX } from '../../../common/memory';
import type { NightshiftRoleKind } from './constants';

/** Kibana's application name in Elasticsearch application privileges (default `.kibana` index). */
const KIBANA_APPLICATION = 'kibana-.kibana';

/** Marks roles `_enable` owns, so it updates them on every run and never touches others. */
export const NIGHTSHIFT_ROLE_METADATA = { managed_by: 'nightshift' } as const;

export type NightshiftRoleDefinition = Omit<SecurityPutRoleRequest, 'name'>;

/** Kibana feature privileges in Elasticsearch's application privilege form, for one space. */
const kibanaFeatures = (
  spaceId: string,
  features: Record<string, readonly string[]>
): NonNullable<NightshiftRoleDefinition['applications']> => [
  {
    application: KIBANA_APPLICATION,
    privileges: Object.entries(features).flatMap(([feature, privileges]) =>
      privileges.map((privilege) => `feature_${feature}.${privilege}`)
    ),
    resources: [`space:${spaceId}`],
  },
];

/**
 * The roles of "Nightshift service accounts and required privileges", scoped to one space. Kibana
 * privileges name only that space; Elasticsearch privileges are cluster-wide by nature.
 *
 * - `agent` (`_nightshift_agent` in the doc), held by the investigation agent and the relay
 *   Slack bot: runs investigations, executes sandbox tools, persists results, and runs the
 *   learning hooks that write Cortex, Semantic Memory and decision trees.
 * - `automations`: matches triggers and starts investigations, which then run as the agent
 *   account. It needs no learning-index access.
 * - `detection`: the detection and context pipeline. It manages Alerting v2 rules and writes
 *   Nightshift sources, KIs, queries, events and detections.
 *
 * Nightshift's `manage-engines` sub-feature (`configure_nightshift`) is excluded from all of them:
 * configuration belongs to the administrator.
 */
export const buildNightshiftRole = (
  kind: NightshiftRoleKind,
  spaceId: string
): NightshiftRoleDefinition => {
  switch (kind) {
    case 'agent':
      return {
        description: `Nightshift investigation agent in space [${spaceId}]. Managed by Nightshift.`,
        // Inference endpoints (EIS) for the agent's model.
        cluster: ['monitor_inference'],
        indices: [
          {
            names: [CORTEX_AI_INDEX_DEST],
            // `auto_configure` lets the first write create the index.
            privileges: ['read', 'index', 'delete', 'auto_configure'],
            allow_restricted_indices: false,
          },
          {
            names: [MEMORY_INDEX, DECISION_TREE_AI_INDEX_DEST],
            privileges: ['read', 'index', 'auto_configure'],
            allow_restricted_indices: false,
          },
        ],
        applications: kibanaFeatures(spaceId, {
          // `manage_nightshift`, which the sandbox tools and investigation routes check.
          nightshift: ['minimal_all'],
          // `agentBuilder:read` and `agentBuilder:write`, for the agent run and its conversation.
          agentBuilder: ['minimal_all'],
          // Connector resolution and execution for the model.
          actions: ['read'],
        }),
        metadata: NIGHTSHIFT_ROLE_METADATA,
      };
    case 'automations':
      return {
        description: `Nightshift automations in space [${spaceId}]. Managed by Nightshift.`,
        cluster: ['monitor_inference'],
        applications: kibanaFeatures(spaceId, {
          nightshift: ['read'],
          // A start claims the investigation's subjects, which needs `manage_investigations`.
          // Nightshift `read` does not grant it, and Nightshift `all` would also grant
          // `manage_nightshift`, so it comes from the investigations sub-feature alone.
          agenticInvestigations: ['minimal_read', 'investigations_all'],
          // The start API requires `agentBuilder:write`.
          agentBuilder: ['minimal_all'],
          actions: ['read'],
        }),
        metadata: NIGHTSHIFT_ROLE_METADATA,
      };
    case 'detection':
      return {
        description: `Nightshift detections and context pipeline in space [${spaceId}]. Managed by Nightshift.`,
        cluster: ['monitor_inference'],
        indices: [
          {
            // Detection workflows query it with raw Elasticsearch calls as their own identity.
            names: ['.significant_events-detections'],
            privileges: ['read'],
            allow_restricted_indices: false,
          },
          {
            // The space's Nightshift source views. Source indices themselves are granted per
            // source by an administrator.
            names: [`$.nightshift.sources.${spaceId}.*`],
            privileges: ['read', 'manage'],
            allow_restricted_indices: false,
          },
        ],
        applications: kibanaFeatures(spaceId, {
          nightshift: ['minimal_all'],
          // Detection workflows manage Alerting v2 rules directly.
          alerting_v2_rules: ['all'],
          agentBuilder: ['minimal_all'],
          actions: ['read'],
        }),
        metadata: NIGHTSHIFT_ROLE_METADATA,
      };
  }
};
