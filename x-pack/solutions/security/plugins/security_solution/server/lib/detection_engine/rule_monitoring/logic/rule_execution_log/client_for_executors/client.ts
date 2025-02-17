/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { sum } from 'lodash';
import type { Duration } from 'moment';

import type {
  PublicRuleMonitoringService,
  PublicRuleResultService,
} from '@kbn/alerting-plugin/server/types';
import type {
  RuleExecutionSettings,
  RuleExecutionStatus,
  LogLevel,
} from '../../../../../../../common/api/detection_engine/rule_monitoring';
import {
  consoleLogLevelFromExecutionStatus,
  LogLevelSetting,
  logLevelToNumber,
  RuleExecutionStatusEnum,
} from '../../../../../../../common/api/detection_engine/rule_monitoring';

import { assertUnreachable } from '../../../../../../../common/utility_types';
import { withSecuritySpan } from '../../../../../../utils/with_security_span';
import type { ExtMeta } from '../../utils/console_logging';
import { truncateValue } from '../../utils/normalization';
import { getCorrelationIds } from './correlation_ids';

import type { IEventLogWriter } from '../event_log/event_log_writer';
import type {
  IRuleExecutionLogForExecutors,
  RuleExecutionContext,
  StatusChangeArgs,
} from './client_interface';
import type { RuleExecutionMetrics } from '../../../../../../../common/api/detection_engine/rule_monitoring/model';
import { LogLevelEnum } from '../../../../../../../common/api/detection_engine/rule_monitoring/model';

export const createRuleExecutionLogClientForExecutors = (
  settings: RuleExecutionSettings,
  eventLog: IEventLogWriter,
  logger: Logger,
  context: RuleExecutionContext,
  ruleMonitoringService: PublicRuleMonitoringService,
  ruleResultService: PublicRuleResultService
): IRuleExecutionLogForExecutors => {
  const baseCorrelationIds = getCorrelationIds(context);
  const baseLogSuffix = baseCorrelationIds.getLogSuffix();
  const baseLogMeta = baseCorrelationIds.getLogMeta();

  const { executionId, ruleId, ruleUuid, ruleName, ruleRevision, ruleType, spaceId } = context;

  const client: IRuleExecutionLogForExecutors = {
    get context() {
      return context;
    },

    trace(...messages: string[]): void {
      writeMessage(messages, LogLevelEnum.trace);
    },

    debug(...messages: string[]): void {
      writeMessage(messages, LogLevelEnum.debug);
    },

    info(...messages: string[]): void {
      writeMessage(messages, LogLevelEnum.info);
    },

    warn(...messages: string[]): void {
      writeMessage(messages, LogLevelEnum.warn);
    },

    error(...messages: string[]): void {
      writeMessage(messages, LogLevelEnum.error);
    },

    async logStatusChange(args: StatusChangeArgs): Promise<void> {
      await withSecuritySpan('IRuleExecutionLogForExecutors.logStatusChange', async () => {
        const correlationIds = baseCorrelationIds.withStatus(args.newStatus);
        const logMeta = correlationIds.getLogMeta();

        try {
          const normalizedArgs = normalizeStatusChangeArgs(args);

          await Promise.all([
            writeStatusChangeToConsole(normalizedArgs, logMeta),
            writeStatusChangeToRuleObject(normalizedArgs),
            writeStatusChangeToEventLog(normalizedArgs),
          ]);
        } catch (e) {
          const logMessage = `Error changing rule status to "${args.newStatus}"`;
          writeExceptionToConsole(e, logMessage, logMeta);
        }
      });
    },
  };

  const writeMessage = (messages: string[], logLevel: LogLevel): void => {
    const message = messages.join(' ');
    writeMessageToConsole(message, logLevel, baseLogMeta);
    writeMessageToEventLog(message, logLevel);
  };

  const writeMessageToConsole = (message: string, logLevel: LogLevel, logMeta: ExtMeta): void => {
    switch (logLevel) {
      case LogLevelEnum.trace:
        logger.trace(`${message} ${baseLogSuffix}`, logMeta);
        break;
      case LogLevelEnum.debug:
        logger.debug(`${message} ${baseLogSuffix}`, logMeta);
        break;
      case LogLevelEnum.info:
        logger.info(`${message} ${baseLogSuffix}`, logMeta);
        break;
      case LogLevelEnum.warn:
        logger.warn(`${message} ${baseLogSuffix}`, logMeta);
        break;
      case LogLevelEnum.error:
        logger.error(`${message} ${baseLogSuffix}`, logMeta);
        break;
      default:
        assertUnreachable(logLevel);
    }
  };

  const writeMessageToEventLog = (message: string, logLevel: LogLevel): void => {
    const { isEnabled, minLevel } = settings.extendedLogging;

    if (!isEnabled || minLevel === LogLevelSetting.off) {
      return;
    }
    if (logLevelToNumber(logLevel) < logLevelToNumber(minLevel)) {
      return;
    }

    eventLog.logMessage({
      ruleId,
      ruleUuid,
      ruleName,
      ruleRevision,
      ruleType,
      spaceId,
      executionId,
      message,
      logLevel,
    });
  };

  const writeExceptionToConsole = (e: unknown, message: string, logMeta: ExtMeta): void => {
    const logReason = e instanceof Error ? e.stack ?? e.message : String(e);
    writeMessageToConsole(`${message}. Reason: ${logReason}`, LogLevelEnum.error, logMeta);
  };

  const writeStatusChangeToConsole = (args: NormalizedStatusChangeArgs, logMeta: ExtMeta): void => {
    const messageParts: string[] = [`Changing rule status to "${args.newStatus}"`, args.message];
    const logMessage = messageParts.filter(Boolean).join('. ');
    const logLevel = consoleLogLevelFromExecutionStatus(args.newStatus, args.userError);
    writeMessageToConsole(logMessage, logLevel, logMeta);
  };

  const writeStatusChangeToRuleObject = async (args: NormalizedStatusChangeArgs): Promise<void> => {
    const { newStatus, message, metrics, userError } = args;

    if (newStatus === RuleExecutionStatusEnum.running) {
      return;
    }

    const {
      total_search_duration_ms: totalSearchDurationMs,
      total_indexing_duration_ms: totalIndexingDurationMs,
      execution_gap_duration_s: executionGapDurationS,
      gap_range: gapRange,
    } = metrics ?? {};

    if (totalSearchDurationMs) {
      ruleMonitoringService.setLastRunMetricsTotalSearchDurationMs(totalSearchDurationMs);
    }

    if (totalIndexingDurationMs) {
      ruleMonitoringService.setLastRunMetricsTotalIndexingDurationMs(totalIndexingDurationMs);
    }

    if (executionGapDurationS) {
      ruleMonitoringService.setLastRunMetricsGapDurationS(executionGapDurationS);
    }

    if (gapRange) {
      ruleMonitoringService.setLastRunMetricsGapRange(gapRange);
    }

    if (newStatus === RuleExecutionStatusEnum.failed) {
      ruleResultService.addLastRunError(message, userError ?? false);
    } else if (newStatus === RuleExecutionStatusEnum['partial failure']) {
      ruleResultService.addLastRunWarning(message);
    }

    ruleResultService.setLastRunOutcomeMessage(message);
  };

  const writeStatusChangeToEventLog = (args: NormalizedStatusChangeArgs): void => {
    const { newStatus, message, metrics } = args;

    if (metrics) {
      eventLog.logExecutionMetrics({
        ruleId,
        ruleUuid,
        ruleName,
        ruleRevision,
        ruleType,
        spaceId,
        executionId,
        metrics,
      });
    }

    eventLog.logStatusChange({
      ruleId,
      ruleUuid,
      ruleName,
      ruleRevision,
      ruleType,
      spaceId,
      executionId,
      newStatus,
      message,
    });
  };

  return client;
};

interface NormalizedStatusChangeArgs {
  newStatus: RuleExecutionStatus;
  message: string;
  metrics?: RuleExecutionMetrics;
  userError?: boolean;
}

const normalizeStatusChangeArgs = (args: StatusChangeArgs): NormalizedStatusChangeArgs => {
  if (args.newStatus === RuleExecutionStatusEnum.running) {
    return {
      newStatus: args.newStatus,
      message: '',
    };
  }
  const { newStatus, message, metrics, userError } = args;

  return {
    newStatus,
    message: truncateValue(message) ?? '',
    metrics: metrics
      ? {
          total_search_duration_ms: normalizeDurations(metrics.searchDurations),
          total_indexing_duration_ms: normalizeDurations(metrics.indexingDurations),
          total_enrichment_duration_ms: normalizeDurations(metrics.enrichmentDurations),
          execution_gap_duration_s: normalizeGap(metrics.executionGap),
          gap_range: metrics.gapRange ?? undefined,
        }
      : undefined,
    userError,
  };
};

const normalizeDurations = (durations?: string[]): number | undefined => {
  if (durations == null) {
    return undefined;
  }

  const sumAsFloat = sum(durations.map(Number));
  return Math.round(sumAsFloat);
};

const normalizeGap = (duration?: Duration): number | undefined => {
  return duration ? Math.round(duration.asSeconds()) : undefined;
};
