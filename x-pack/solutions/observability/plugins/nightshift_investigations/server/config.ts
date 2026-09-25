/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import type { PluginConfigDescriptor } from '@kbn/core-plugins-server';

const sandboxConfigSchema = schema.object({
  /**
   * Id of the preconfigured connector holding the Elasticsearch URL and API key the sandbox
   * queries telemetry with. It is added to the investigator's connector allow-list; credentials
   * are injected per command, only when the agent asks for it.
   */
  telemetry_connector_id: schema.maybe(schema.string()),
  // Operator-supplied readable index patterns and remote names for the telemetry manifest.
  telemetry_readable_indices: schema.maybe(schema.string({ maxLength: 10_000 })),
});

const cortexConfigSchema = schema.object({
  /**
   * Governs Cortex end to end: the hydrate/optimize hooks on the investigator agent, the Cortex
   * HTTP routes, and the Cortex tab in the significant events app, which reads this flag through
   * the routes below.
   */
  enabled: schema.boolean({ defaultValue: true }),
});

const decisionTreesConfigSchema = schema.object({
  // Governs the decision-tree reinforcement agent end to end: the post-execution hook on the
  // investigator, the hydrate step that materializes trees into the sandbox, the agent's own
  // tools, the decision-tree AI index, and the Decision Trees tab in the significant events app.
  // Trees are edited in the sandbox and read the Cortex investigator context, so this still
  // requires cortex.enabled (and sandbox) at runtime.
  enabled: schema.boolean({ defaultValue: true }),
});

const configSchema = schema.object({
  // Reserved: Core skips loading this plugin entirely when false.
  enabled: schema.boolean({ defaultValue: true }),
  sandbox: schema.maybe(sandboxConfigSchema),
  cortex: cortexConfigSchema,
  decision_trees: decisionTreesConfigSchema,
});

export type NightshiftInvestigationsConfig = TypeOf<typeof configSchema>;

export const config: PluginConfigDescriptor<NightshiftInvestigationsConfig> = {
  schema: configSchema,
};
