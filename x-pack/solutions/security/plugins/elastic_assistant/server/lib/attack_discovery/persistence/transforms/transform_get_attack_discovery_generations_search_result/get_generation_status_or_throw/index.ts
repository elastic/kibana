/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATION_STARTED,
  ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATION_DISMISSED,
  ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATION_FAILED,
  ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATION_SUCCEEDED,
  ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATION_CANCELED,
} from '../../../../../../../common/constants';

export const getGenerationStatusOrThrow = ({
  executionUuid,
  eventActions,
}: {
  eventActions: string[];
  executionUuid: string;
}): 'started' | 'succeeded' | 'failed' | 'canceled' | 'dismissed' => {
  if (!eventActions.includes(ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATION_STARTED)) {
    throw new Error(
      `Generation ${executionUuid} is missing ${ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATION_STARTED} event.action`
    );
  }

  if (eventActions.includes(ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATION_DISMISSED)) {
    return 'dismissed';
  }

  if (eventActions.includes(ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATION_FAILED)) {
    return 'failed';
  }

  if (eventActions.includes(ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATION_SUCCEEDED)) {
    return 'succeeded';
  }

  if (eventActions.includes(ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATION_CANCELED)) {
    return 'canceled';
  }

  return 'started';
};
