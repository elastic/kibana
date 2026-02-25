/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import agent from 'elastic-apm-node';
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
  LogMessageOptions,
  RuleExecutionContext,
  StatusChangeArgs,
} from './client_interface';
import type { RuleExecutionMetrics } from '../../../../../../../common/api/detection_engine/rule_monitoring/model';
import { LogLevelEnum } from '../../../../../../../common/api/detection_engine/rule_monitoring/model';
import { SECURITY_RULE_STATUS } from '../../../../rule_types/utils/apm_field_names';
import type {
  ExecutionOutcomeDocument,
  ExecutionOutcomeStats,
} from '../../../../../../../common/api/detection_engine/rule_monitoring/model/execution_outcome';

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

  const outcomeBuffer: {
    stats: ExecutionOutcomeStats;
    errors: Array<{ message: string; timestamp: string }>;
    warnings: Array<{ message: string; timestamp: string }>;
  } = {
    stats: {},
    errors: [],
    warnings: [],
  };

  const client: IRuleExecutionLogForExecutors = {
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
      writeMessage(message, {
        eventLogLevel: LogLevelEnum.warn,
        consoleLogLevel: options?.consoleLogLevel,
      });
    },

    error(message: string, options?: LogMessageOptions): void {
      writeMessage(message, {
        eventLogLevel: LogLevelEnum.error,
        consoleLogLevel: options?.consoleLogLevel,
      });
    },

    async logStatusChange(args: StatusChangeArgs): Promise<void> {
      await withSecuritySpan('IRuleExecutionLogForExecutors.logStatusChange', async () => {
        const correlationIds = baseCorrelationIds.withStatus(args.newStatus);
        const logMeta = correlationIds.getLogMeta();

        agent.addLabels({ [SECURITY_RULE_STATUS]: args.newStatus });

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

    stats(data: ExecutionOutcomeStats): void {
      Object.assign(outcomeBuffer.stats, data);

      if (data.errors) {
        outcomeBuffer.errors.push(...data.errors);
      }
      if (data.warnings) {
        outcomeBuffer.warnings.push(...data.warnings);
      }
    },

    flush(): void {
      const now = new Date().toISOString();
      const s = outcomeBuffer.stats;

      const outcomeDocument: ExecutionOutcomeDocument = {
        '@timestamp': now,
        execution_id: executionId,
        rule_id: ruleId,
        rule_uuid: ruleUuid,
        rule_name: ruleName,
        rule_revision: ruleRevision,
        rule_type: ruleType,
        space_id: spaceId,

        status: s.status ?? 'unknown',
        status_message: s.status_message,

        execution_duration_ms: s.execution_duration_ms ?? 0,
        started_at: s.started_at ?? now,
        completed_at: s.completed_at ?? now,
        schedule_delay_ms: s.schedule_delay_ms,

        total_search_duration_ms: s.total_search_duration_ms,
        total_indexing_duration_ms: s.total_indexing_duration_ms,
        total_enrichment_duration_ms: s.total_enrichment_duration_ms,

        alerts_created_count: s.alerts_created_count ?? 0,
        alerts_suppressed_count: s.alerts_suppressed_count ?? 0,
        events_found_count: s.events_found_count ?? 0,
        events_excluded_count: s.events_excluded_count ?? 0,

        execution_gap_duration_s: s.execution_gap_duration_s,
        gap_range: s.gap_range,

        input_index_patterns: s.input_index_patterns ?? [],
        indices_accessed_count: s.indices_accessed_count,
        indices_inaccessible: s.indices_inaccessible,
        indices_missing_timestamp_field: s.indices_missing_timestamp_field,
        timestamp_field_used: s.timestamp_field_used ?? '@timestamp',
        timestamp_override: s.timestamp_override,
        frozen_indices_queried_count: s.frozen_indices_queried_count ?? 0,
        found_no_indices: s.found_no_indices ?? false,

        exception_lists_count: s.exception_lists_count ?? 0,
        exception_items_count: s.exception_items_count ?? 0,
        unprocessed_exceptions_count: s.unprocessed_exceptions_count ?? 0,
        unprocessed_exception_reasons: s.unprocessed_exception_reasons,

        timed_out: s.timed_out ?? false,
        execution_cancelled: s.execution_cancelled ?? false,

        has_permission_errors: s.has_permission_errors ?? false,
        permission_error_details: s.permission_error_details,

        errors: outcomeBuffer.errors,
        warnings: outcomeBuffer.warnings,

        indicator_match: s.indicator_match,
        threshold: s.threshold,
        esql: s.esql,
        eql: s.eql,
        ml: s.ml,
        new_terms: s.new_terms,

        last_alert_created_at: s.last_alert_created_at,
        consecutive_no_alert_runs: s.consecutive_no_alert_runs,
      };

      try {
        eventLog.logExecutionOutcome({
          ruleId,
          ruleUuid,
          ruleName,
          ruleRevision,
          ruleType,
          spaceId,
          executionId,
          outcome: outcomeDocument,
        });
      } catch (e) {
        writeExceptionToConsole(e, 'Error flushing execution outcome', baseLogMeta);
      }
    },
  };

  const writeMessage = (
    message: string,
    levels: { eventLogLevel: LogLevel; consoleLogLevel?: LogLevel }
  ): void => {
    writeMessageToConsole(message, levels.consoleLogLevel ?? LogLevelEnum.debug, baseLogMeta);
    writeMessageToEventLog(message, levels.eventLogLevel);
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
          frozen_indices_queried_count: metrics.frozenIndicesQueriedCount,
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
