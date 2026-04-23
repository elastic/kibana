/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConsumerExecutionMetrics } from '@kbn/alerting-plugin/server/types';
import type {
  RuleExecutionStatus,
  RuleExecutionStatusEnum,
} from '../../../../../../../common/api/detection_engine/rule_monitoring';

/**
 * Used from rule executors to log various information about the rule execution:
 *   - rule status changes
 *   - rule execution metrics
 *   - generic logs with debug/info/warning messages and errors
 *
 * Write targets: console logs, Event Log, saved objects.
 *
 * We create a new instance of this interface per each rule execution.
 */
export interface IRuleExecutionLogForExecutors {
  /**
   * Context with correlation ids and data related to the current rule execution.
   */
  context: RuleExecutionContext;

  /**
   * Writes a trace message to the event log and console at TRACE level.
   */
  trace(message: string, options?: LogMessageOptions): void;

  /**
   * Writes a debug message to the event log and console at DEBUG level.
   */
  debug(message: string, options?: LogMessageOptions): void;

  /**
   * Writes an info message to the event log at INFO level.
   * Writes to console at DEBUG level by default (override via options.consoleLogLevel).
   */
  info(message: string, options?: LogMessageOptions): void;

  /**
   * Writes a warning message to the event log at WARN level.
   * Writes to console at DEBUG level by default (override via options.consoleLogLevel).
   */
  warn(message: string, options?: LogMessageOptions): void;

  /**
   * Writes an error message to the event log at ERROR level.
   * Writes to console at DEBUG level by default (override via options.consoleLogLevel).
   */
  error(message: string, options?: LogErrorMessageOptions): void;

  /**
   * Logs a rule execution metric like a number of source events found and a number of generated alerts.
   * Metric names are type-checked against RuleExecutionMetrics.
   */
  logMetric<Metric extends keyof RuleExecutionLogMetrics>(
    metricName: Metric,
    value: RuleExecutionLogMetrics[Metric]
  ): void;

  /**
   * Convenience method to log multiple rule execution metrics like a number of source events
   * found and a number of generated alerts.
   * Metric names are type-checked against RuleExecutionMetrics.
   */
  logMetrics(metrics: Partial<RuleExecutionLogMetrics>): void;

  /**
   * Whether the logger is closed
   */
  closed(): boolean;

  /**
   * Closes the logger and writes the logged data to the event log
   */
  close(): Promise<void>;
}

/**
 * Each time a rule gets executed, we build an instance of rule execution context that
 * contains correlation ids and data common to this particular rule execution.
 */
export interface RuleExecutionContext {
  /**
   * Every execution of a rule executor gets assigned its own UUID at the Alerting Framework
   * level. We can use this id to filter all console logs, execution events in Event Log,
   * and detection alerts written during a particular rule execution.
   */
  executionId: string;

  /**
   * Dynamic, saved object id of the rule being executed (rule.id).
   */
  ruleId: string;

  /**
   * Static, global (or "signature") id of the rule being executed (rule.rule_id).
   */
  ruleUuid: string;

  /**
   * Name of the rule being executed.
   */
  ruleName: string;

  /**
   * Current revision of the rule being execution (rule.revision)
   */
  ruleRevision: number;

  /**
   * Alerting Framework's rule type id of the rule being executed.
   */
  ruleType: string;

  /**
   * Kibana space id of the rule being executed.
   */
  spaceId: string;
}

export interface LogMessageOptions {
  /**
   * Override the console log level. Defaults to DEBUG when not specified.
   */
  consoleLogLevel?: LogLevel;
}

export interface LogErrorMessageOptions extends LogMessageOptions {
  /**
   * Whether this is a user side error.
   */
  userError?: boolean;
}

/**
 * @deprecated To be removed in favor of Alerting Framework's "execute" event
 *
 * We have to accept total_search_duration_ms in the rule execution logger as
 * it's difficult to extract this value from the Alerting Framework
 *
 * After fully migrating to the AF's execute event RuleExecutionLogMetrics should
 * be removed.
 */
export type RuleExecutionLogMetrics = Partial<
  ConsumerExecutionMetrics & { total_search_duration_ms: number }
>;

/**
 * Arguments for logging the final execution result. The status must not be 'running'.
 */
export interface ExecutionResult {
  status: Exclude<RuleExecutionStatus, RuleExecutionStatusEnum['running']>;
  message: string;
  userError?: boolean;
}
