/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omitBy } from 'lodash';
import agent from 'elastic-apm-node';
import type { Logger } from '@kbn/core/server';
import type {
  PublicRuleMonitoringService,
  PublicRuleResultService,
} from '@kbn/alerting-plugin/server/types';
import type {
  RuleExecutionSettings,
  LogLevel,
  RuleExecutionStatus,
} from '../../../../../../../common/api/detection_engine/rule_monitoring';
import {
  consoleLogLevelFromExecutionStatus,
  RuleExecutionStatusEnum,
} from '../../../../../../../common/api/detection_engine/rule_monitoring';
import { assertUnreachable } from '../../../../../../../common/utility_types';
import { withSecuritySpan } from '../../../../../../utils/with_security_span';
import type { ExtMeta } from '../../utils/console_logging';
import { truncateList, truncateValue } from '../../utils/normalization';
import type { IEventLogWriter } from '../event_log/event_log_writer';
import {
  LogLevelEnum,
  LogLevelSetting,
  logLevelToNumber,
} from '../../../../../../../common/api/detection_engine/rule_monitoring/model';
import { SECURITY_RULE_STATUS } from '../../../../rule_types/utils/apm_field_names';
import type {
  ExecutionResult,
  IRuleExecutionLogForExecutors,
  LogErrorMessageOptions,
  LogMessageOptions,
  RuleExecutionContext,
  RuleExecutionLogMetrics,
} from './client_interface';
import { getCorrelationIds } from './correlation_ids';
import { checkErrorDetails } from '../../../../rule_types/utils/check_error_details';

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
  const baseLogMeta = baseCorrelationIds.getLogMeta();
  const { executionId, ruleId, ruleUuid, ruleName, ruleRevision, ruleType, spaceId } = context;

  // Buffers the execution related data
  const executionResultBuffer: ExecutionResultBuffer = {
    errors: [],
    warnings: [],
    metrics: {},
    closed: false,
  };

  const ruleExecutionLogClient: IRuleExecutionLogForExecutors = {
    get context() {
      return context;
    },

    trace(message: string, options?: LogMessageOptions): void {
      writeMessage(message, {
        eventLogLevel: LogLevelEnum.trace,
        consoleLogLevel: options?.consoleLogLevel ?? LogLevelEnum.trace,
      });
    },

    debug(message: string, options?: LogMessageOptions): void {
      writeMessage(message, {
        eventLogLevel: LogLevelEnum.debug,
        consoleLogLevel: options?.consoleLogLevel ?? LogLevelEnum.debug,
      });
    },

    info(message: string, options?: LogMessageOptions): void {
      writeMessage(message, {
        eventLogLevel: LogLevelEnum.info,
        consoleLogLevel: options?.consoleLogLevel,
      });
    },

    warn(message: string, options?: LogMessageOptions): void {
      executionResultBuffer.warnings.push(message);

      writeMessage(message, {
        eventLogLevel: LogLevelEnum.warn,
        consoleLogLevel: options?.consoleLogLevel,
      });
    },

    error(message: string, options?: LogErrorMessageOptions): void {
      executionResultBuffer.errors.push({
        message,
        userError: options?.userError ?? false,
      });

      writeMessage(message, {
        eventLogLevel: LogLevelEnum.error,
        consoleLogLevel: options?.consoleLogLevel,
      });
    },

    logMetric<Metric extends keyof RuleExecutionLogMetrics>(
      metricName: Metric,
      value: NonNullable<RuleExecutionLogMetrics[Metric]>
    ): void {
      if (this.closed()) {
        return;
      }

      executionResultBuffer.metrics[metricName] = value;

      // total_search_duration_ms gets calculated and logged at the Alerting Framework level
      if (metricName !== 'total_search_duration_ms') {
        ruleMonitoringService.setMetric(metricName, value);
      }
    },

    logMetrics(metrics: Partial<RuleExecutionLogMetrics>): void {
      if (this.closed()) {
        return;
      }

      Object.assign(executionResultBuffer.metrics, metrics);

      // total_search_duration_ms gets calculated and logged at the Alerting Framework level
      ruleMonitoringService.setMetrics(
        omitBy(metrics, (value, key) => value == null || key === 'total_search_duration_ms')
      );
    },

    closed(): boolean {
      return executionResultBuffer.closed;
    },

    async close(): Promise<void> {
      if (this.closed()) {
        throw new Error('The logger has been closed');
      }

      executionResultBuffer.closed = true;

      await withSecuritySpan('IRuleExecutionLogForExecutors.close', async () => {
        const executionResult: ExecutionResult = determineExecutionResult(executionResultBuffer);

        const correlationIds = baseCorrelationIds.withStatus(executionResult.status);
        const logMeta = correlationIds.getLogMeta();

        agent.addLabels({ [SECURITY_RULE_STATUS]: executionResult.status });

        try {
          const normalizedExecutionResult: ExecutionResult = {
            status: executionResult.status,
            message: truncateValue(executionResult.message) ?? '',
            userError: executionResult.userError,
          };

          writeStatusChangeToEventLog(normalizedExecutionResult);
          writeMetricsToEventLog(executionResultBuffer.metrics);

          await Promise.all([
            writeExecutionResultToConsole(normalizedExecutionResult, logMeta),
            writeExecutionResultToRuleObject(normalizedExecutionResult),
          ]);
        } catch (e) {
          const logMessage = `Error writing execution result with status "${executionResult.status}"`;
          writeExceptionToConsole(e, logMessage, logMeta);
        }
      });
    },
  };

  const determineExecutionResult = ({
    errors,
    warnings,
  }: ExecutionResultBuffer): ExecutionResult => {
    let status: RuleExecutionStatus = RuleExecutionStatusEnum.succeeded;
    let message = 'Rule execution completed successfully';

    if (errors.length > 0) {
      status = RuleExecutionStatusEnum.failed;
      message = truncateList(errors.map((e) => e.message)).join(', ');
    } else if (warnings.length > 0) {
      status = RuleExecutionStatusEnum['partial failure'];
      message = truncateList(warnings).join('\n\n');
    }

    return {
      status,
      message,
      userError: errors.every(
        ({ message: errorMessage, userError }) =>
          userError || checkErrorDetails(new Error(errorMessage)).isUserError
      ),
    };
  };

  const writeExceptionToConsole = (e: unknown, message: string, logMeta: ExtMeta): void => {
    const logReason = e instanceof Error ? e.stack ?? e.message : String(e);
    writeMessageToConsole(`${message}. Reason: ${logReason}`, LogLevelEnum.error, logMeta);
  };

  const writeExecutionResultToConsole = (args: ExecutionResult, logMeta: ExtMeta): void => {
    const messageParts: string[] = [`Changing rule status to "${args.status}"`, args.message];
    const logMessage = messageParts.filter(Boolean).join('. ');
    const logLevel = consoleLogLevelFromExecutionStatus(args.status, args.userError);

    writeMessageToConsole(logMessage, logLevel, logMeta);
  };

  const writeExecutionResultToRuleObject = async (args: ExecutionResult): Promise<void> => {
    const { status, message, userError } = args;

    if (status === RuleExecutionStatusEnum.failed) {
      ruleResultService.addLastRunError(message, userError ?? false);
    } else if (status === RuleExecutionStatusEnum['partial failure']) {
      ruleResultService.addLastRunWarning(message);
    }

    ruleResultService.setLastRunOutcomeMessage(message);
  };

  const writeMessage = (
    message: string,
    levels: { eventLogLevel: LogLevel; consoleLogLevel?: LogLevel }
  ): void => {
    writeMessageToConsole(message, levels.consoleLogLevel ?? LogLevelEnum.debug, baseLogMeta);
    writeMessageToEventLog(message, levels.eventLogLevel);
  };

  /**
   * @deprecated To be removed in favor of Alerting Framework's "execute" event
   */
  const writeStatusChangeToEventLog = (args: ExecutionResult): void => {
    const { status, message } = args;

    eventLog.logStatusChange({
      status,
      message,
      ruleInfo: {
        ruleId,
        ruleUuid,
        ruleName,
        ruleRevision,
        ruleType,
        spaceId,
        executionId,
      },
    });
  };

  /**
   * @deprecated To be removed in favor of Alerting Framework's "execute" event
   */
  const writeMetricsToEventLog = (metrics: RuleExecutionLogMetrics): void => {
    eventLog.logExecutionMetrics({
      metrics: {
        total_search_duration_ms: metrics.total_search_duration_ms,
        total_indexing_duration_ms: metrics.total_indexing_duration_ms,
        total_enrichment_duration_ms: metrics.total_enrichment_duration_ms,
        frozen_indices_queried_count: metrics.frozen_indices_queried_count,
        execution_gap_duration_s: metrics.gap_duration_s,
        gap_range: metrics.gap_range,
      },
      ruleInfo: {
        ruleId,
        ruleUuid,
        ruleName,
        ruleRevision,
        ruleType,
        spaceId,
        executionId,
      },
    });
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

interface ExecutionResultBuffer {
  errors: Array<{ message: string; userError: boolean }>;
  warnings: string[];
  metrics: RuleExecutionLogMetrics;
  closed: boolean;
}
