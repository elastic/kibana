/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import { BaseActionRequestSchema } from '../../common/base';

const { parameters, ...restBaseSchema } = BaseActionRequestSchema;
const getNonEmptyString = (fieldName: string) =>
  schema.string({
    minLength: 1,
    validate: (value) => {
      if (!value.trim().length) {
        return `${fieldName} cannot be an empty string`;
      }
    },
  });

// CrowdStrike schemas
const CrowdStrikeRunScriptActionRequestParamsSchema = schema.object(
  {
    /**
     * The script to run
     */
    raw: schema.maybe(getNonEmptyString('Raw')),
    /**
     * The path to the script on the host to run
     */
    hostPath: schema.maybe(getNonEmptyString('HostPath')),
    /**
     * The path to the script in the cloud to run
     */
    cloudFile: schema.maybe(getNonEmptyString('CloudFile')),
    /**
     * The command line to run
     */
    commandLine: schema.maybe(getNonEmptyString('CommandLine')),
    /**
     * The max timeout value before the command is killed. Number represents milliseconds
     */
    timeout: schema.maybe(schema.number({ min: 1 })),
  },
  {
    validate: (params) => {
      if (!params.raw && !params.hostPath && !params.cloudFile) {
        return 'At least one of Raw, HostPath, or CloudFile must be provided';
      }
    },
  }
);

// Microsoft Defender Endpoint schemas
export const MSDefenderEndpointRunScriptActionRequestParamsSchema = schema.object({
  /**
   * The path to the script in the cloud to run
   */
  scriptName: getNonEmptyString('ScriptName'),
  args: schema.maybe(getNonEmptyString('Args')),
});

export const MSDefenderEndpointRunScriptActionRequestSchema = {
  body: schema.object({
    ...restBaseSchema,
    parameters: MSDefenderEndpointRunScriptActionRequestParamsSchema,
  }),
};

export const RunScriptActionRequestSchema = {
  body: schema.object({
    ...restBaseSchema,
    parameters: schema.conditional(
      schema.siblingRef('agent_type'),
      'crowdstrike',
      CrowdStrikeRunScriptActionRequestParamsSchema,
      schema.conditional(
        schema.siblingRef('agent_type'),
        'microsoft_defender_endpoint',
        MSDefenderEndpointRunScriptActionRequestParamsSchema,
        schema.never()
      )
    ),
  }),
};

export type MSDefenderRunScriptActionRequestParams = TypeOf<
  typeof MSDefenderEndpointRunScriptActionRequestParamsSchema
>;
export type RunScriptActionRequestBody = TypeOf<typeof RunScriptActionRequestSchema.body>;
