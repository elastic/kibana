/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsType } from '@kbn/core/server';
import { schema, type TypeOf } from '@kbn/config-schema';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';

/**
 * One document per space recording the maintenance state of Significant Events
 * background activity in that space (`enabled` / `paused`). A space without a
 * document is enabled. The type is space-isolated (`single`), so the same fixed
 * id exists independently in every space and pausing one space leaves the others
 * untouched.
 *
 * `state` is stored as a free-form string (keyword) rather than a closed enum
 * so a newer node can persist a state an older node does not yet know about;
 * readers normalise unknown values back to the default. The document also
 * stores the exact set of workflows and rules of its own space that were
 * disabled, so resume can re-enable precisely what was turned off (and nothing
 * that was already off). No data other than these enablement flags is affected.
 */
export const SIGNIFICANT_EVENTS_MAINTENANCE_STATE_SO_TYPE = 'significant-events-maintenance-state';

/**
 * The id intentionally matches the type name: there is only ever one document per space, so
 * the id is fixed and a space's document is found without a lookup.
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

const maintenanceDeletedCountsSchemaV2 = schema.object({
  knowledgeIndicators: schema.number(),
  storedQueries: schema.number(),
  rules: schema.number(),
  investigations: schema.number(),
  dataStreams: schema.number(),
});

const maintenanceSummarySchemaV2 = maintenanceSummarySchemaV1.extends({
  deleted: schema.maybe(maintenanceDeletedCountsSchemaV2),
});

const disabledWorkflowSchemaV1 = schema.object({
  id: schema.string(),
  // Kept so the model-version 3 schema stays unchanged. Reads ignore it: a document is per space.
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

const maintenanceStateAttributesV2 = maintenanceStateAttributesV1.extends({
  lastSummary: schema.maybe(maintenanceSummarySchemaV2),
});

const maintenanceStateAttributesV3 = schema.object({
  state: schema.string(),
  updatedAt: schema.maybe(schema.string()),
  updatedBy: schema.maybe(schema.string()),
  disabledWorkflows: schema.arrayOf(disabledWorkflowSchemaV1, {
    maxSize: MAINTENANCE_STATE_ARRAY_MAX_SIZE,
  }),
  // Rules are recorded with the same `{ id, spaceId }` shape as workflows.
  disabledRules: schema.arrayOf(disabledWorkflowSchemaV1, {
    maxSize: MAINTENANCE_STATE_ARRAY_MAX_SIZE,
  }),
  lastSummary: schema.maybe(maintenanceSummarySchemaV2),
  pausedSettings: schema.maybe(pausedFeatureSettingsSchemaV1),
});

export type SignificantEventsMaintenanceStateAttributes = TypeOf<
  typeof maintenanceStateAttributesV3
>;

/**
 * Rules recorded before version 3 had no space, and the stored ids can't recover it, so they
 * are attributed to the default space. Reads no longer trust the stored `spaceId` anyway: a
 * document records only its own space's inventory, so the document's space wins.
 */
export const backfillDisabledRules = (
  attributes: Partial<TypeOf<typeof maintenanceStateAttributesV1>> &
    Partial<SignificantEventsMaintenanceStateAttributes>
): { attributes: Pick<SignificantEventsMaintenanceStateAttributes, 'disabledRules'> } => ({
  attributes: {
    disabledRules:
      attributes.disabledRules ??
      (attributes.disabledRuleIds ?? []).map((id) => ({ id, spaceId: DEFAULT_SPACE_ID })),
  },
});

export const getSignificantEventsMaintenanceStateSavedObjectType = (): SavedObjectsType => ({
  name: SIGNIFICANT_EVENTS_MAINTENANCE_STATE_SO_TYPE,
  hidden: true,
  namespaceType: 'single',
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
    '2': {
      changes: [],
      schemas: {
        forwardCompatibility: maintenanceStateAttributesV2.extends({}, { unknowns: 'ignore' }),
        create: maintenanceStateAttributesV2,
      },
    },
    '3': {
      changes: [
        {
          type: 'data_backfill',
          backfillFn: ({ attributes }) => backfillDisabledRules(attributes),
        },
      ],
      schemas: {
        forwardCompatibility: maintenanceStateAttributesV3.extends({}, { unknowns: 'ignore' }),
        create: maintenanceStateAttributesV3,
      },
    },
  },
});
