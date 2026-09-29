/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import type { PluginConfigDescriptor } from '@kbn/core-plugins-server';

/**
 * The request-scoped Elasticsearch connector: the sandbox queries this cluster with the API key of
 * the current agent run, injected per command only when the agent asks for it.
 */
const sandboxElasticsearchConfigSchema = schema.object({
  // Disable where the sandbox cannot reach this cluster, e.g. network policies or no public URL.
  enabled: schema.boolean({ defaultValue: true }),
  // Elasticsearch URL as reachable from inside the sandbox. Defaults to elasticsearch.publicBaseUrl.
  url: schema.maybe(schema.uri({ scheme: ['http', 'https'] })),
});

const sandboxConfigSchema = schema.object({
  elasticsearch: sandboxElasticsearchConfigSchema,
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
  deprecations: ({ unused }) => [
    // Replaced by the request-scoped Elasticsearch connector.
    unused('sandbox.telemetry_connector_id', { level: 'warning' }),
  ],
};
