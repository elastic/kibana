/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import type { PluginConfigDescriptor } from '@kbn/core-plugins-server';

const wikiConfigSchema = schema.object({
  /**
   * Governs Wiki end to end: the hydrate/optimize hooks on the investigator agent, the Wiki
   * HTTP routes, and the Wiki tab in the significant events app, which reads this flag through
   * the routes below.
   */
  enabled: schema.boolean({ defaultValue: true }),
});

const decisionTreesConfigSchema = schema.object({
  // Governs the decision-tree reinforcement agent end to end: the post-execution hook on the
  // investigator, the hydrate step that materializes trees into the sandbox, the agent's own
  // tools, the decision-tree AI index, and the Decision Trees tab in the significant events app.
  // Trees are edited in the sandbox and read the Wiki investigator context, so this still
  // requires wiki.enabled (and sandbox) at runtime.
  enabled: schema.boolean({ defaultValue: true }),
});

const memoryConfigSchema = schema.object({
  // Governs Semantic Memory independently of Wiki: index ensure, hydrate/
  // optimize hooks on the deductive agent, and the matching managed workflows.
  enabled: schema.boolean({ defaultValue: true }),
});

const findingsRecorderConfigSchema = schema.object({
  // Governs the findings recorder: the cycle hook and the blocking final pass that write the
  // summary, severity, verdict, hypotheses and impact the investigator no longer records itself.
  // Turn it off to measure the investigator on its own, as the evals do.
  enabled: schema.boolean({ defaultValue: true }),
});

const configSchema = schema.object({
  // Reserved: Core skips loading this plugin entirely when false.
  enabled: schema.boolean({ defaultValue: true }),
  wiki: wikiConfigSchema,
  decision_trees: decisionTreesConfigSchema,
  memory: memoryConfigSchema,
  findings_recorder: findingsRecorderConfigSchema,
});

export type NightshiftInvestigationsConfig = TypeOf<typeof configSchema>;

export const config: PluginConfigDescriptor<NightshiftInvestigationsConfig> = {
  schema: configSchema,
  // The former `sandbox.telemetry_*` settings: Elasticsearch is now a connector saved on the
  // investigator. Dropped with a warning so a stale kibana.yml does not stop Kibana from starting.
  deprecations: ({ renameFromRoot, unused }) => [
    // The feature was renamed from Cortex to Wiki. Deployments that still set the old key keep
    // working, so cluster configs do not have to change in lockstep with this plugin.
    renameFromRoot(
      'xpack.nightshift_investigations.cortex.enabled',
      'xpack.nightshift_investigations.wiki.enabled',
      { level: 'warning' }
    ),
    unused('sandbox', {
      level: 'warning',
      message:
        '"xpack.nightshift_investigations.sandbox" is no longer used. Save the Elasticsearch connector on the Nightshift investigator agent instead.',
    }),
  ],
};
