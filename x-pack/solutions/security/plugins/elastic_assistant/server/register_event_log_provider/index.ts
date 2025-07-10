/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IEventLogService } from '@kbn/event-log-plugin/server';

import {
  ATTACK_DISCOVERY_EVENT_ACTIONS,
  ATTACK_DISCOVERY_EVENT_PROVIDER,
} from '../../common/constants';

export const registerEventLogProvider = (eventLog: IEventLogService) =>
  eventLog.registerProviderActions(ATTACK_DISCOVERY_EVENT_PROVIDER, ATTACK_DISCOVERY_EVENT_ACTIONS);
