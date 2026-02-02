/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsType } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import type { StepProgressPayload } from '../routes/types';

export const OBSERVABILITY_ONBOARDING_STATE_SAVED_OBJECT_TYPE = 'observability-onboarding-state';

export interface LogFilesState {
  datasetName: string;
  serviceName?: string;
  customConfigurations?: string;
  logFilePaths: string[];
  namespace: string;
}

type ObservabilityOnboardingFlowState = LogFilesState | undefined;

type ObservabilityOnboardingType = 'autoDetect';

export interface ObservabilityOnboardingFlow {
  type: ObservabilityOnboardingType;
  state: ObservabilityOnboardingFlowState;
  progress: Record<
    string,
    {
      status: string;
      message?: string;
      payload?: StepProgressPayload;
    }
  >;
}

export interface SavedObservabilityOnboardingFlow extends ObservabilityOnboardingFlow {
  id: string;
  updatedAt: number;
}

const LogFilesStateSchema = schema.object({
  datasetName: schema.string(),
  serviceName: schema.maybe(schema.string()),
  customConfigurations: schema.maybe(schema.string()),
  logFilePaths: schema.arrayOf(schema.string(), { maxSize: 100 }),
  namespace: schema.string(),
});

const SystemLogsStateSchema = schema.object({
  namespace: schema.string(),
});

const LogsDetectLoadingStepPayloadSchema = schema.object({
  os: schema.string(),
  arch: schema.string(),
});

const ElasticAgentStepPayloadSchema = schema.object({
  agentId: schema.string(),
});

export const InstallIntegrationsStepPayloadSchema = schema.arrayOf(
  schema.object({
    pkgName: schema.string(),
    pkgVersion: schema.string(),
    installSource: schema.oneOf([schema.literal('registry'), schema.literal('custom')]),
    // codeql[js/kibana/unbounded-array-in-schema] Populated from Fleet package metadata, not user input
    inputs: schema.arrayOf(schema.any()),
    // codeql[js/kibana/unbounded-array-in-schema] Populated from Fleet packageInfo.data_streams (registry) or hardcoded to 1 (custom)
    dataStreams: schema.arrayOf(
      schema.object({
        type: schema.string(),
        dataset: schema.string(),
      })
    ),
    // codeql[js/kibana/unbounded-array-in-schema] Populated from Fleet pkg.installed_kibana (registry) or empty array (custom)
    kibanaAssets: schema.arrayOf(
      schema.object({
        type: schema.string(),
        id: schema.string(),
      })
    ),
    metadata: schema.maybe(
      schema.oneOf([
        schema.object({
          hostname: schema.string(),
        }),
      ])
    ),
  }),
  { maxSize: 100 }
);

export const observabilityOnboardingFlow: SavedObjectsType = {
  name: OBSERVABILITY_ONBOARDING_STATE_SAVED_OBJECT_TYPE,
  hidden: false,
  namespaceType: 'agnostic',
  mappings: {
    properties: {
      type: { type: 'keyword' },
      state: { type: 'object', dynamic: false },
      progress: { type: 'object', dynamic: false },
    },
  },
  modelVersions: {
    '1': {
      changes: [],
      schemas: {
        create: schema.object({
          type: schema.string(),
          state: schema.maybe(schema.oneOf([LogFilesStateSchema, SystemLogsStateSchema])),
          progress: schema.mapOf(
            schema.string(),
            schema.object({
              status: schema.string(),
              message: schema.maybe(schema.string()),
              payload: schema.maybe(ElasticAgentStepPayloadSchema),
            })
          ),
        }),
      },
    },
    '2': {
      changes: [],
      schemas: {
        create: schema.object({
          type: schema.string(),
          state: schema.maybe(
            schema.oneOf([LogFilesStateSchema, SystemLogsStateSchema, schema.never()])
          ),
          progress: schema.mapOf(
            schema.string(),
            schema.object({
              status: schema.string(),
              message: schema.maybe(schema.string()),
              payload: schema.maybe(
                schema.oneOf([
                  ElasticAgentStepPayloadSchema,
                  InstallIntegrationsStepPayloadSchema,
                  LogsDetectLoadingStepPayloadSchema,
                ])
              ),
            })
          ),
        }),
      },
    },
  },
};
