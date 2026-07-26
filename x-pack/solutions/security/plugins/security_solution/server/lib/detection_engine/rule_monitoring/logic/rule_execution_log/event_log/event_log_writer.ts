/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsUtils } from '@kbn/core/server';
import type { IEvent, IEventLogService } from '@kbn/event-log-plugin/server';
import { SAVED_OBJECT_REL_PRIMARY } from '@kbn/event-log-plugin/server';
import type { CpsData } from '@kbn/alerting-plugin/server/types';
import type {
  LogLevel,
  RuleExecutionMetrics,
  RuleExecutionStatus,
} from '../../../../../../../common/api/detection_engine/rule_monitoring';
import {
  logLevelToNumber,
  ruleExecutionStatusToNumber,
} from '../../../../../../../common/api/detection_engine/rule_monitoring';
import {
  eventLogLevelFromExecutionStatus,
  LogLevelEnum,
  RuleExecutionEventTypeEnum,
} from '../../../../../../../common/api/detection_engine/rule_monitoring/model';
import {
  RULE_SAVED_OBJECT_TYPE,
  RULE_EXECUTION_LOG_PROVIDER,
} from '../../event_log/event_log_constants';

export interface IEventLogWriter {
  logMessage(args: MessageArgs): void;
  logStatusChange(args: StatusChangeArgs): void;
  logExecutionMetrics(args: ExecutionMetricsArgs): void;
}

export interface RuleInfo {
  ruleId: string;
  ruleUuid: string;
  ruleName: string;
  ruleRevision: number;
  ruleType: string;
  spaceId: string;
  executionId: string;
  cpsData?: CpsData;
}

export interface MessageArgs {
  logLevel: LogLevel;
  message: string;
  ruleInfo: RuleInfo;
}

export interface StatusChangeArgs {
  status: RuleExecutionStatus;
  message?: string;
  ruleInfo: RuleInfo;
}

export interface ExecutionMetricsArgs {
  metrics: RuleExecutionMetrics;
  ruleInfo: RuleInfo;
}

export interface ExecutionResultLogEntry {
  timestamp: string;
  message: string;
}

export const createEventLogWriter = (eventLogService: IEventLogService): IEventLogWriter => {
  const eventLogger = eventLogService.getLogger({
    event: { provider: RULE_EXECUTION_LOG_PROVIDER },
  });

  let sequence = 0;

  type EventKibana = NonNullable<NonNullable<IEvent>['kibana']>;

  const getCpsFields = (ruleInfo: RuleInfo): Partial<EventKibana> =>
    ruleInfo.cpsData
      ? ({
          cps_scope_expression: ruleInfo.cpsData.resolvedExpression,
          cps_scope_linked_projects: ruleInfo.cpsData.linkedProjects.length
            ? ruleInfo.cpsData.linkedProjects.map(({ id, alias, type, organization }) => ({
                id,
                alias,
                type,
                organization,
              }))
            : undefined,
        } as Partial<EventKibana>)
      : {};

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
          ...getCpsFields(args.ruleInfo),
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

    logStatusChange: (args: StatusChangeArgs): void => {
      const logLevel = eventLogLevelFromExecutionStatus(args.status);
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
          action: RuleExecutionEventTypeEnum['status-change'],
          sequence: sequence++,
          severity: logLevelToNumber(logLevel),
        },
        log: {
          level: logLevel,
        },
        kibana: {
          alert: {
            rule: {
              execution: {
                uuid: args.ruleInfo.executionId,
                status: args.status,
                status_order: ruleExecutionStatusToNumber(args.status),
              },
              revision: args.ruleInfo.ruleRevision,
            },
          },
          ...getCpsFields(args.ruleInfo),
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

    logExecutionMetrics: (args: ExecutionMetricsArgs): void => {
      const logLevel = LogLevelEnum.info;
      eventLogger.logEvent({
        '@timestamp': nowISO(),
        rule: {
          id: args.ruleInfo.ruleId,
          uuid: args.ruleInfo.ruleUuid,
          name: args.ruleInfo.ruleName,
          category: args.ruleInfo.ruleType,
        },
        event: {
          kind: 'metric',
          action: RuleExecutionEventTypeEnum['execution-metrics'],
          sequence: sequence++,
          severity: logLevelToNumber(logLevel),
        },
        log: {
          level: logLevel,
        },
        kibana: {
          alert: {
            rule: {
              execution: {
                uuid: args.ruleInfo.executionId,
                metrics: args.metrics,
              },
              revision: args.ruleInfo.ruleRevision,
            },
          },
          ...getCpsFields(args.ruleInfo),
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
