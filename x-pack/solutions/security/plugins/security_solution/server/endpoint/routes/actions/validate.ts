/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaResponseFactory, Logger } from '@kbn/core/server';
import {
  CrowdStrikeRunScriptActionRequestSchema,
  MSDefenderEndpointRunScriptActionRequestSchema,
} from '../../../../common/api/endpoint';
import type { ResponseActionsRequestBody } from '../../../../common/api/endpoint';
import type {
  ResponseActionAgentType,
  ResponseActionsApiCommandNames,
} from '../../../../common/endpoint/service/response_actions/constants';
import { errorHandler } from '../error_handler';
import { CustomHttpRequestError } from '../../../utils/custom_http_request_error';

const getSchema = (agentType: ResponseActionAgentType | undefined) => {
  if (agentType === 'crowdstrike') {
    return CrowdStrikeRunScriptActionRequestSchema;
  }
  if (agentType === 'microsoft_defender_endpoint') {
    return MSDefenderEndpointRunScriptActionRequestSchema;
  }
  return undefined;
};
export const validateCommandRequest = (
  command: ResponseActionsApiCommandNames,
  reqBody: ResponseActionsRequestBody | undefined,
  logger: Logger,
  res: KibanaResponseFactory
) => {
  switch (command) {
    case 'runscript':
      try {
        const schema = getSchema(reqBody?.agent_type);
        schema?.body.validate(reqBody);
      } catch (err) {
        return errorHandler(
          logger,
          res,
          new CustomHttpRequestError(`Invalid request body: ${err.message}`, 400)
        );
      }
      break;

    // Add cases for other commands that need validation here
    // case 'isolate':
    //   ...
    //   break;
  }

  return null; // No error, validation passed
};
