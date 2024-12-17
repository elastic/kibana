/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SentinelOneActivityRecord,
  SentinelOneGetActivitiesParams,
} from '@kbn/stack-connectors-plugin/common/sentinelone/types';
import type { DeepPartial, Mutable } from 'utility-types';
import { SentinelOneDataGenerator } from '../../../../../../common/endpoint/data_generators/sentinelone_data_generator';
import { buildSentinelOneRoutePath } from './utils';
import type { ExternalEdrServerEmulatorRouteHandlerMethod } from '../../../external_edr_server_emulator.types';
import type { EmulatorServerRouteDefinition } from '../../../lib/emulator_server.types';

const generator = new SentinelOneDataGenerator();

export const getActivitiesRouteDefinition = (): EmulatorServerRouteDefinition => {
  return {
    path: buildSentinelOneRoutePath('/activities'),
    method: 'GET',
    handler: activitiesRouteHandler,
  };
};

const activitiesRouteHandler: ExternalEdrServerEmulatorRouteHandlerMethod<
  {},
  NonNullable<SentinelOneGetActivitiesParams>
> = async (request) => {
  const queryParams = request.query;
  const activityOverrides: DeepPartial<Mutable<SentinelOneActivityRecord>> = {};

  if (queryParams?.activityTypes) {
    activityOverrides.activityType = Number(queryParams.activityTypes.split(',').at(0));
  }

  if (queryParams?.agentIds) {
    activityOverrides.agentId = queryParams.agentIds.split(',').at(0);
  }

  return generator.generateSentinelOneApiActivityResponse(activityOverrides);
};
