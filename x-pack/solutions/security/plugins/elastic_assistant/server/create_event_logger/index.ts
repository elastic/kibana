/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IEventLogService, IEventLogger } from '@kbn/event-log-plugin/server';

import { ATTACK_DISCOVERY_EVENT_PROVIDER } from '../../common/constants';

export const createEventLogger = (eventLog: IEventLogService): IEventLogger =>
  eventLog.getLogger({
    event: { provider: ATTACK_DISCOVERY_EVENT_PROVIDER },
  });
