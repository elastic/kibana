/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UnsupportedAgentTypeError } from './lib/errors';
import type { CustomScriptsClientOptions } from './lib/base_custom_scripts_client';
import type { CustomScriptsClientInterface } from './lib/types';
import { CrowdstrikeCustomScriptsClient } from './crowdstrike/crowdstrike_custom_scrtipts_client';
import type { ResponseActionAgentType } from '../../../../../common/endpoint/service/response_actions/constants';

/**
 * Retrieve a agent status  client for an agent type
 * @param agentType
 * @param constructorOptions
 *
 */

export const getCustomScriptsClient = (
  agentType: ResponseActionAgentType,
  constructorOptions: CustomScriptsClientOptions
): CustomScriptsClientInterface => {
  switch (agentType) {
    // case 'endpoint':
    //   return new EndpointCustomScriptsClient(constructorOptions);
    // case 'sentinel_one':
    //   return new SentinelOneCustomScriptsClient(constructorOptions);
    case 'crowdstrike':
      return new CrowdstrikeCustomScriptsClient(constructorOptions);
    default:
      throw new UnsupportedAgentTypeError(
        `Agent type [${agentType}] does not support agent status`
      );
  }
};
