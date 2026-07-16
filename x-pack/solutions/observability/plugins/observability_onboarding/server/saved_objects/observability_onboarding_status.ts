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
  createdBy?: string;
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
const MAX_CREATED_BY_LENGTH = 1024;
const MAX_STEP_NAME_LENGTH = 256;
const MAX_STEP_STATUS_LENGTH = 64;
const MAX_STEP_MESSAGE_LENGTH = 10_000;

const LogFilesStateSchema = schema.object({
  datasetName: schema.string(),
  serviceName: schema.maybe(schema.string()),
  customConfigurations: schema.maybe(schema.string()),
  logFilePaths: schema.arrayOf(schema.string()),
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
    inputs: schema.arrayOf(schema.any()),
    dataStreams: schema.arrayOf(
      schema.object({
        type: schema.string(),
        dataset: schema.string(),
      })
    ),
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
  })
);

const observabilityOnboardingFlowAttributesSchema = schema.object({
  type: schema.string({ maxLength: MAX_FLOW_TYPE_LENGTH }),
  createdBy: schema.maybe(schema.string({ maxLength: MAX_CREATED_BY_LENGTH })),
  state: schema.maybe(schema.oneOf([LogFilesStateSchema, SystemLogsStateSchema, schema.never()])),
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
});

export const observabilityOnboardingFlow: SavedObjectsType = {
  name: OBSERVABILITY_ONBOARDING_STATE_SAVED_OBJECT_TYPE,
  hidden: true,
  namespaceType: 'agnostic',
  mappings: {
    properties: {
      type: { type: 'keyword' },
      createdBy: { type: 'keyword', ignore_above: MAX_CREATED_BY_LENGTH },
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
    '3': {
      changes: [
        {
          type: 'mappings_addition',
          addedMappings: {
            createdBy: { type: 'keyword', ignore_above: MAX_CREATED_BY_LENGTH },
          },
        },
      ],
      schemas: {
        create: observabilityOnboardingFlowAttributesSchema,
        forwardCompatibility: observabilityOnboardingFlowAttributesSchema.extends(
          {},
          { unknowns: 'ignore' }
        ),
      },
    },
  },
};
