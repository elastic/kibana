/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginConfigDescriptor } from '@kbn/core/server';
import { schema, type TypeOf } from '@kbn/config-schema';

export const configSchema = schema.object({
  demo: schema.object({
    /**
     * Demo only. Forces `assess_investigation` to promote every investigation to an incident so a
     * staged run is deterministic, bypassing the model's `isIncident` verdict. Never enable outside
     * a demo — it defeats the assessment the Watch Floor exists to make.
     *
     * The Watch Floor reads it through the seam `_derive` already opens: the route returns it as
     * `demoForceIncident` and `assess_investigation` ORs it with the real verdict. A config rather
     * than a workflow `const`, so flipping it needs no YAML edit, no version bump and no workflow
     * re-install. It fails in the right direction too: `derive_ids` carries
     * `on-failure: { continue: true }`, so a degraded `_derive` renders the field empty, KQL yields
     * false, and the condition falls through to the **real** verdict — a broken demo switch can
     * never silently force-escalate.
     */
    forceIncident: schema.boolean({ defaultValue: false }),
  }),
  enabled: schema.boolean({ defaultValue: false }),
  ui: schema.object({
    // Live Workflows / Agent Builder projection is the default: request-scoped Workflows authz is
    // now enforced inside the watch projection layer (see watch_workflow_projection_service.ts), so
    // mock mode is no longer the safe default. Set `true` only to serve UI fixtures without a stack.
    useMockData: schema.boolean({ defaultValue: false }),
  }),
});

export type PndConfig = TypeOf<typeof configSchema>;

export const config: PluginConfigDescriptor<PndConfig> = {
  exposeToBrowser: {
    // Exposed so the UI can render a "Demo mode" badge whenever the switch is on: a run that
    // skipped the assessment must never be mistakable for a real verdict on screen.
    demo: true,
    enabled: true,
    ui: true,
  },
  schema: configSchema,
};
