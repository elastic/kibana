/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import agent from 'elastic-apm-node';
import type { Logger } from '@kbn/core/server';
import type {
  ConsumerExecutionMetrics,
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
  RuleExecutionStatusEnum,
} from '../../../../../../../common/api/detection_engine/rule_monitoring';
import { assertUnreachable } from '../../../../../../../common/utility_types';
import { withSecuritySpan } from '../../../../../../utils/with_security_span';
import type { ExtMeta } from '../../utils/console_logging';
import { truncateValue } from '../../utils/normalization';
import type { ExecutionResultLogEntry, IEventLogWriter } from '../event_log/event_log_writer';
import type { RuleExecutionMetrics } from '../../../../../../../common/api/detection_engine/rule_monitoring/model';
import {
  LogLevelEnum,
  LogLevelSetting,
  logLevelToNumber,
} from '../../../../../../../common/api/detection_engine/rule_monitoring/model';
import { SECURITY_RULE_STATUS } from '../../../../rule_types/utils/apm_field_names';
import type { IRuleExecutionLogForExecutors, RuleExecutionContext } from './client_interface';
import { getCorrelationIds } from './correlation_ids';

export function createRuleExecutionLogClientForExecutors(
  settings: RuleExecutionSettings,
  eventLog: IEventLogWriter,
  logger: Logger,
  context: RuleExecutionContext,
  ruleMonitoringService: PublicRuleMonitoringService,
  ruleResultService: PublicRuleResultService
): IRuleExecutionLogForExecutors {
  const baseCorrelationIds = getCorrelationIds(context);
  const baseLogSuffix = baseCorrelationIds.getLogSuffix();
  const { executionId, ruleId, ruleUuid, ruleName, ruleRevision, ruleType, spaceId } = context;

  // Buffers the execution related data
  const executionResultBuffer: ExecutionResultBuffer = {
    errors: [],
    warnings: [],
    executionResult: undefined,
    closed: false,
  };

  const ruleExecutionLogClient: IRuleExecutionLogForExecutors = {
    get context() {
      return context;
    },

    trace(message: string): void {
      writeMessageToEventLog(message, LogLevelEnum.trace);
    },

    debug(message: string): void {
      writeMessageToEventLog(message, LogLevelEnum.debug);
    },

    info(message: string): void {
      writeMessageToEventLog(message, LogLevelEnum.info);
    },

    warn(message: string): void {
      if (this.closed()) {
        throw new Error('The logger has been closed');
      }

      executionResultBuffer.warnings.push({
        timestamp: new Date().toISOString(),
        message,
      });
    },

    error(message: string): void {
      if (this.closed()) {
        throw new Error('The logger has been closed');
      }

      executionResultBuffer.warnings.push({
        timestamp: new Date().toISOString(),
        message,
      });
    },

    logMetric<Metric extends keyof ConsumerExecutionMetrics>(
      metricName: Metric,
      value: ConsumerExecutionMetrics[Metric]
    ): void {
      if (this.closed() || value === undefined) {
        return;
      }

      ruleMonitoringService.setMetric(metricName, value);
    },

    logMetrics(metrics: Partial<ConsumerExecutionMetrics>): void {
      if (this.closed()) {
        return;
      }

      ruleMonitoringService.setMetrics(metrics);
    },

    logExecutionResult(args: ExecutionOutcome): void {
      executionResultBuffer.executionResult = args;
    },

    closed(): boolean {
      return executionResultBuffer.closed;
    },

    async close(): Promise<void> {
      const executionResult = executionResultBuffer.executionResult;

      if (!executionResult) {
        throw new Error(
          'Rule execution result must be set before closing the rule execution log client'
        );
      }

      if (this.closed()) {
        throw new Error('The logger has been closed');
      }

      executionResultBuffer.closed = true;

      await withSecuritySpan('IRuleExecutionLogForExecutors.close', async () => {
        const correlationIds = baseCorrelationIds.withStatus(executionResult.outcome);
        const logMeta = correlationIds.getLogMeta();

        agent.addLabels({ [SECURITY_RULE_STATUS]: executionResult.outcome });

        try {
          const executionOutcome: ExecutionOutcome = {
            outcome: executionResult.outcome,
            message: truncateValue(executionResult.message) ?? '',
            userError: executionResult.userError,
          };

          await Promise.all([
            writeExecutionResultToConsole(executionOutcome, logMeta),
            writeExecutionResultToRuleObject(executionOutcome),
          ]);
        } catch (e) {
          const logMessage = `Error logging execution result with outcome "${executionResult.outcome}"`;
          writeExceptionToConsole(e, logMessage, logMeta);
        }
      });
    },
  };

  const writeExceptionToConsole = (e: unknown, message: string, logMeta: ExtMeta): void => {
    const logReason = e instanceof Error ? e.stack ?? e.message : String(e);
    writeMessageToConsole(`${message}. Reason: ${logReason}`, LogLevelEnum.error, logMeta);
  };

  const writeExecutionResultToConsole = (args: ExecutionOutcome, logMeta: ExtMeta): void => {
    const messageParts: string[] = [`Changing rule status to "${args.outcome}"`, args.message];
    const logMessage = messageParts.filter(Boolean).join('. ');
    const logLevel = consoleLogLevelFromExecutionStatus(args.outcome, args.userError);

    writeMessageToConsole(logMessage, logLevel, logMeta);
  };

  const writeExecutionResultToRuleObject = async (args: ExecutionOutcome): Promise<void> => {
    const { outcome, message, userError } = args;

    if (outcome === RuleExecutionStatusEnum.running) {
      return;
    }

    if (outcome === RuleExecutionStatusEnum.failed) {
      ruleResultService.addLastRunError(message, userError ?? false);
    } else if (outcome === RuleExecutionStatusEnum['partial failure']) {
      ruleResultService.addLastRunWarning(message);
    }

    ruleResultService.setLastRunOutcomeMessage(message);
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
      ruleInfo: {
        ruleId,
        ruleUuid,
        ruleName,
        ruleRevision,
        ruleType,
        spaceId,
        executionId,
      },
      message,
      logLevel,
    });
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

  return ruleExecutionLogClient;
}

interface ExecutionOutcome {
  outcome: RuleExecutionStatus;
  message: string;
  metrics?: Partial<RuleExecutionMetrics>;
  userError?: boolean;
}

interface ExecutionResultBuffer {
  errors: ExecutionResultLogEntry[];
  warnings: ExecutionResultLogEntry[];
  executionResult: ExecutionOutcome | undefined;
  closed: boolean;
}
