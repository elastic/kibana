/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsType } from '@kbn/core/server';
import { schema, type TypeOf } from '@kbn/config-schema';

export const SIGNIFICANT_EVENTS_MAINTENANCE_STATE_SO_TYPE = 'significant-events-maintenance-state';

/**
 * A single, deployment-wide document recording the maintenance state of
 * Significant Events background activity (`enabled` / `paused`). It is a
 * global (not per-space) control, so a fixed id + `agnostic` namespace is used.
 *
 * `state` is stored as a free-form string (keyword) rather than a closed enum
 * so a newer node can persist a state an older node does not yet know about;
 * readers normalise unknown values back to the default. The document also
 * stores the exact set of workflows and rules that were disabled, so resume
 * can re-enable precisely what was turned off (and nothing that was already
 * off). No data other than these enablement flags is affected.
 *
 * The id intentionally matches the type name: there is only ever one document.
 */
export const SIGNIFICANT_EVENTS_MAINTENANCE_STATE_SO_ID = 'significant-events-maintenance-state';

/**
 * Upper bound for arrays persisted on the maintenance SO. Entries scale with
 * spaces / managed targets; this is well above realistic deployments and
 * satisfies CodeQL unbounded-array checks on SO create schemas.
 */
const MAINTENANCE_STATE_ARRAY_MAX_SIZE = 10000;

const maintenanceFailureSchemaV1 = schema.object({
  target: schema.string(),
  error: schema.string(),
});

const maintenanceSummarySchemaV1 = schema.object({
  state: schema.string(),
  executionsCancelled: schema.number(),
  workflowsDisabled: schema.number(),
  rulesDisabled: schema.number(),
  partialFailures: schema.arrayOf(maintenanceFailureSchemaV1, {
    maxSize: MAINTENANCE_STATE_ARRAY_MAX_SIZE,
  }),
});

const disabledWorkflowSchemaV1 = schema.object({
  id: schema.string(),
  spaceId: schema.string(),
});

const pausedFeatureSettingsSchemaV1 = schema.object({
  continuousOnboardingWasEnabled: schema.boolean(),
  scheduledDiscoveryEnabledSpaceIds: schema.arrayOf(schema.string(), {
    maxSize: MAINTENANCE_STATE_ARRAY_MAX_SIZE,
  }),
});

const maintenanceStateAttributesV1 = schema.object({
  state: schema.string(),
  updatedAt: schema.maybe(schema.string()),
  updatedBy: schema.maybe(schema.string()),
  disabledWorkflows: schema.arrayOf(disabledWorkflowSchemaV1, {
    maxSize: MAINTENANCE_STATE_ARRAY_MAX_SIZE,
  }),
  disabledRuleIds: schema.arrayOf(schema.string(), {
    maxSize: MAINTENANCE_STATE_ARRAY_MAX_SIZE,
  }),
  lastSummary: schema.maybe(maintenanceSummarySchemaV1),
  pausedSettings: schema.maybe(pausedFeatureSettingsSchemaV1),
});

export type SignificantEventsMaintenanceStateAttributes = TypeOf<
  typeof maintenanceStateAttributesV1
>;

export const getSignificantEventsMaintenanceStateSavedObjectType = (): SavedObjectsType => ({
  name: SIGNIFICANT_EVENTS_MAINTENANCE_STATE_SO_TYPE,
  hidden: true,
  namespaceType: 'agnostic',
  mappings: {
    dynamic: false,
    properties: {
      state: { type: 'keyword', ignore_above: 1024 },
    },
  },
  management: {
    importableAndExportable: false,
  },
  modelVersions: {
    '1': {
      changes: [],
      schemas: {
        forwardCompatibility: maintenanceStateAttributesV1.extends({}, { unknowns: 'ignore' }),
        create: maintenanceStateAttributesV1,
      },
    },
  },
});
