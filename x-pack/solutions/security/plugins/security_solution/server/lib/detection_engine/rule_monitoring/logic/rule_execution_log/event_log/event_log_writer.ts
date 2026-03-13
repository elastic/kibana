/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsUtils } from '@kbn/core/server';
import type { IEventLogService } from '@kbn/event-log-plugin/server';
import { SAVED_OBJECT_REL_PRIMARY } from '@kbn/event-log-plugin/server';
import type { LogLevel } from '../../../../../../../common/api/detection_engine/rule_monitoring';
import { logLevelToNumber } from '../../../../../../../common/api/detection_engine/rule_monitoring';
import type {
  RuleExecutionMetrics,
  RuleExecutionStatus,
} from '../../../../../../../common/api/detection_engine/rule_monitoring/model';
import { RuleExecutionEventTypeEnum } from '../../../../../../../common/api/detection_engine/rule_monitoring/model';
import {
  RULE_SAVED_OBJECT_TYPE,
  RULE_EXECUTION_LOG_PROVIDER,
} from '../../event_log/event_log_constants';

export interface IEventLogWriter {
  logMessage(args: MessageArgs): void;
}

export interface RuleInfo {
  ruleId: string;
  ruleUuid: string;
  ruleName: string;
  ruleRevision: number;
  ruleType: string;
  spaceId: string;
  executionId: string;
}

export interface MessageArgs {
  logLevel: LogLevel;
  message: string;
  ruleInfo: RuleInfo;
}

export interface ExecutionResultLogEntry {
  timestamp: string;
  message: string;
}

export interface ExecutionResultArgs {
  ruleInfo: RuleInfo;
  outcome: RuleExecutionStatus;
  message?: string;
  metrics: RuleExecutionMetrics;
  errors: ExecutionResultLogEntry[];
  warnings: ExecutionResultLogEntry[];
}

export const createEventLogWriter = (eventLogService: IEventLogService): IEventLogWriter => {
  const eventLogger = eventLogService.getLogger({
    event: { provider: RULE_EXECUTION_LOG_PROVIDER },
  });

  let sequence = 0;

  return {
    logMessage: (args: MessageArgs): void => {
      eventLogger.logEvent({
        '@timestamp': nowISO(),
        message: args.message,
        rule: {
          id: args.ruleInfo.ruleId,
          uuid: args.ruleInfo.ruleUuid,
          name: args.ruleInfo.ruleName,
          category: args.ruleInfo.ruleType,
        },
        event: {
          kind: 'event',
          action: RuleExecutionEventTypeEnum.message,
          sequence: sequence++,
          severity: logLevelToNumber(args.logLevel),
        },
        log: {
          level: args.logLevel,
        },
        kibana: {
          alert: {
            rule: {
              execution: {
                uuid: args.ruleInfo.executionId,
              },
              revision: args.ruleInfo.ruleRevision,
            },
          },
          space_ids: [args.ruleInfo.spaceId],
          saved_objects: [
            {
              rel: SAVED_OBJECT_REL_PRIMARY,
              type: RULE_SAVED_OBJECT_TYPE,
              id: args.ruleInfo.ruleId,
              namespace: spaceIdToNamespace(args.ruleInfo.spaceId),
            },
          ],
        },
      });
    },
  };
};

const nowISO = () => new Date().toISOString();

const spaceIdToNamespace = SavedObjectsUtils.namespaceStringToId;
