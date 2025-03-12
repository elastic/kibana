/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { TelemetryChannel } from './types';
import type { ITaskMetricsService, TaskMetric, Trace } from './task_metrics.types';
import { TaskMetricsService } from './task_metrics';
import type { ITelemetryEventsSender } from './sender';

/**
 * Preview telemetry events sender for the telemetry route.
 * @see telemetry_detection_rules_preview_route
 */
export class PreviewTaskMetricsService implements ITaskMetricsService {
  /** Last sent message */
  private sentMessages: string[] = [];

  /** Logger for this class  */
  private readonly logger: Logger;

  private readonly composite: TaskMetricsService;

  constructor(logger: Logger, private readonly sender: ITelemetryEventsSender) {
    this.logger = logger;
    this.composite = new TaskMetricsService(logger, sender);
  }

  public getSentMessages() {
    return this.sentMessages;
  }

  public start(name: string): Trace {
    this.logger.info('Simulating TaskMetricsService.start');
    return this.composite.start(name);
  }

  public createTaskMetric(trace: Trace, error?: Error): TaskMetric {
    this.logger.info('Simulating TaskMetricsService.createTaskMetric');
    return this.composite.createTaskMetric(trace, error);
  }

  public async end(trace: Trace, error?: Error): Promise<void> {
    this.logger.info('Simulating TaskMetricsService.end');
    const metric = this.composite.createTaskMetric(trace, error);
    this.sender.simulateSendAsync(TelemetryChannel.TASK_METRICS, [metric]);
  }
}
