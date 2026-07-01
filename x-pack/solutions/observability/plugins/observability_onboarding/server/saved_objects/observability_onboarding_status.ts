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

const MAX_FLOW_TYPE_LENGTH = 64;
const MAX_DATASET_NAME_LENGTH = 255;
const MAX_SERVICE_NAME_LENGTH = 256;
const MAX_CUSTOM_CONFIGURATIONS_LENGTH = 10_000;
const MAX_LOG_FILE_PATH_LENGTH = 4096;
const MAX_NAMESPACE_LENGTH = 256;
const MAX_OS_ARCH_LENGTH = 64;
const MAX_AGENT_ID_LENGTH = 256;
const MAX_PACKAGE_NAME_LENGTH = 255;
const MAX_PACKAGE_VERSION_LENGTH = 64;
const MAX_DATA_STREAM_TYPE_LENGTH = 64;
const MAX_DATA_STREAM_DATASET_LENGTH = 255;
const MAX_KIBANA_ASSET_TYPE_LENGTH = 64;
const MAX_KIBANA_ASSET_ID_LENGTH = 255;
const MAX_HOSTNAME_LENGTH = 253;
const MAX_STEP_NAME_LENGTH = 256;
const MAX_STEP_STATUS_LENGTH = 64;
const MAX_STEP_MESSAGE_LENGTH = 10_000;

const LogFilesStateSchema = schema.object({
  datasetName: schema.string({ maxLength: MAX_DATASET_NAME_LENGTH }),
  serviceName: schema.maybe(schema.string({ maxLength: MAX_SERVICE_NAME_LENGTH })),
  customConfigurations: schema.maybe(
    schema.string({ maxLength: MAX_CUSTOM_CONFIGURATIONS_LENGTH })
  ),
  logFilePaths: schema.arrayOf(schema.string({ maxLength: MAX_LOG_FILE_PATH_LENGTH }), {
    maxSize: 100,
  }),
  namespace: schema.string({ maxLength: MAX_NAMESPACE_LENGTH }),
});

const SystemLogsStateSchema = schema.object({
  namespace: schema.string({ maxLength: MAX_NAMESPACE_LENGTH }),
});

const LogsDetectLoadingStepPayloadSchema = schema.object({
  os: schema.string({ maxLength: MAX_OS_ARCH_LENGTH }),
  arch: schema.string({ maxLength: MAX_OS_ARCH_LENGTH }),
});

const ElasticAgentStepPayloadSchema = schema.object({
  agentId: schema.string({ maxLength: MAX_AGENT_ID_LENGTH }),
});

export const InstallIntegrationsStepPayloadSchema = schema.arrayOf(
  schema.object({
    pkgName: schema.string({ maxLength: MAX_PACKAGE_NAME_LENGTH }),
    pkgVersion: schema.string({ maxLength: MAX_PACKAGE_VERSION_LENGTH }),
    installSource: schema.oneOf([schema.literal('registry'), schema.literal('custom')]),
    // codeql[js/kibana/unbounded-array-in-schema] Populated from Fleet package metadata, not user input
    inputs: schema.arrayOf(schema.any()),
    // codeql[js/kibana/unbounded-array-in-schema] Populated from Fleet packageInfo.data_streams (registry) or hardcoded to 1 (custom)
    dataStreams: schema.arrayOf(
      schema.object({
        type: schema.string({ maxLength: MAX_DATA_STREAM_TYPE_LENGTH }),
        dataset: schema.string({ maxLength: MAX_DATA_STREAM_DATASET_LENGTH }),
      })
    ),
    // codeql[js/kibana/unbounded-array-in-schema] Populated from Fleet pkg.installed_kibana (registry) or empty array (custom)
    kibanaAssets: schema.arrayOf(
      schema.object({
        type: schema.string({ maxLength: MAX_KIBANA_ASSET_TYPE_LENGTH }),
        id: schema.string({ maxLength: MAX_KIBANA_ASSET_ID_LENGTH }),
      })
    ),
    metadata: schema.maybe(
      schema.oneOf([
        schema.object({
          hostname: schema.string({ maxLength: MAX_HOSTNAME_LENGTH }),
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
          type: schema.string({ maxLength: MAX_FLOW_TYPE_LENGTH }),
          state: schema.maybe(schema.oneOf([LogFilesStateSchema, SystemLogsStateSchema])),
          progress: schema.mapOf(
            schema.string({ maxLength: MAX_STEP_NAME_LENGTH }),
            schema.object({
              status: schema.string({ maxLength: MAX_STEP_STATUS_LENGTH }),
              message: schema.maybe(schema.string({ maxLength: MAX_STEP_MESSAGE_LENGTH })),
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
          type: schema.string({ maxLength: MAX_FLOW_TYPE_LENGTH }),
          state: schema.maybe(
            schema.oneOf([LogFilesStateSchema, SystemLogsStateSchema, schema.never()])
          ),
          progress: schema.mapOf(
            schema.string({ maxLength: MAX_STEP_NAME_LENGTH }),
            schema.object({
              status: schema.string({ maxLength: MAX_STEP_STATUS_LENGTH }),
              message: schema.maybe(schema.string({ maxLength: MAX_STEP_MESSAGE_LENGTH })),
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
