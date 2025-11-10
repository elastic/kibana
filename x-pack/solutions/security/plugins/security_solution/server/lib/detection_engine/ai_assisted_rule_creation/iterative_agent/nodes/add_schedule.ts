/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { InferenceChatModel } from '@kbn/inference-langchain';
import { JsonOutputParser } from '@langchain/core/output_parsers';
import { TimeDuration } from '@kbn/securitysolution-utils/src/time_duration/time_duration';
import type { RuleSchedule } from '../../../../../../common/api/detection_engine/model/rule_schema/rule_schedule';
import type { RuleCreationState } from '../state';
import { SCHEDULE_RETRIEVAL_PROMPT } from './prompts';
export interface ComputeScheduleParams {
  model: InferenceChatModel;
  logger: Logger;
}

export const defaultSchedule: RuleSchedule = {
  interval: '5m',
  from: 'now-6m',
  to: 'now',
};

interface ScheduleRetrievalChainResponse {
  interval: string | undefined;
  lookback: string | undefined;
}

export const parseAndValidateSchedule = (
  schedule: ScheduleRetrievalChainResponse,
  logger: Logger
) => {
  if (!schedule.interval) {
    logger.debug('Schedule response is missing interval');
    return defaultSchedule;
  }

  const intervalDuration = TimeDuration.parse(schedule.interval);
  let lookbackDuration = TimeDuration.parse(schedule.lookback ?? '');

  if (!intervalDuration || intervalDuration.value <= 0) {
    logger.debug(`Invalid interval value: ${schedule.interval}`);
    return defaultSchedule;
  }

  if (!lookbackDuration || lookbackDuration.value < 0) {
    logger.debug(`Invalid lookback value: ${schedule.lookback}`);

    lookbackDuration = TimeDuration.fromMilliseconds(intervalDuration.toMilliseconds() * 0.1); // Default to 10% of interval if invalid
  }

  // Calculate 'from' as lookback + interval
  const fromDuration = TimeDuration.fromMilliseconds(
    intervalDuration.toMilliseconds() + lookbackDuration.toMilliseconds()
  );

  return {
    interval: schedule.interval,
    from: `now-${fromDuration.toString()}`,
    to: 'now',
  };
};

/**
 * Node that computes the appropriate schedule (interval and from) for a detection rule
 * based on the user query and rule context
 */
export const addScheduleNode = ({ model, logger }: ComputeScheduleParams) => {
  const jsonParser = new JsonOutputParser<ScheduleRetrievalChainResponse>();

  return async (state: RuleCreationState): Promise<RuleCreationState> => {
    try {
      const scheduleRetrievalChain = SCHEDULE_RETRIEVAL_PROMPT.pipe(model).pipe(jsonParser);
      const scheduleRetrievalResult = await scheduleRetrievalChain.invoke({
        user_query: state.userQuery,
      });

      const schedule = parseAndValidateSchedule(scheduleRetrievalResult, logger);

      return {
        ...state,
        rule: {
          ...state.rule,
          ...schedule,
        },
      };
    } catch (error) {
      logger.debug('Error computing schedule:', error);
      return {
        ...state,
        rule: {
          ...state.rule,
          ...defaultSchedule,
        },
        errors: [...state.errors, `Failed to fetch and process tags: ${error.message}`],
      };
    }
  };
};
