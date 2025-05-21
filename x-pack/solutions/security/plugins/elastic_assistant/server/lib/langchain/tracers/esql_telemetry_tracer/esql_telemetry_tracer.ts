/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BaseCallbackHandlerInput } from '@langchain/core/callbacks/base';
import { BaseTracer, Run } from '@langchain/core/tracers/base';
import { AnalyticsServiceSetup, Logger } from '@kbn/core/server';
import { ESQL_GENERATION_VALIDATION_RESULT } from '../../../telemetry/event_based_telemetry';

export interface EsqlTelemetryParams {
  actionTypeId: string;
  model?: string;
}

export interface LangChainTracerFields extends BaseCallbackHandlerInput {
  telemetry: AnalyticsServiceSetup;
  telemetryParams: EsqlTelemetryParams;
}

export const SUCCESS_REPORT_NODE = 'buildSuccessReportFromLastMessage';
export const UNVALIDATED_REPORT_NODE = 'buildUnvalidatedReportFromLastMessage';

/**
 * Telemetry tracer that instruments ESQL generation.
 */
export class EsqlTelemetryTracer extends BaseTracer implements LangChainTracerFields {
  logger: Logger;
  name: string = 'esql_telemetry_tracer';
  telemetry: AnalyticsServiceSetup;
  telemetryParams: EsqlTelemetryParams;

  constructor(fields: LangChainTracerFields, logger: Logger) {
    super(fields);
    this.logger = logger.get('esqlTelemetryTracer');
    this.telemetry = fields.telemetry;
    this.telemetryParams = fields.telemetryParams;
  }

  async onChainEnd(run: Run): Promise<void> {
    if (run.name !== SUCCESS_REPORT_NODE && run.name !== UNVALIDATED_REPORT_NODE) {
      return;
    }

    const eventType = ESQL_GENERATION_VALIDATION_RESULT.eventType;
    const telemetryValue = {
      actionTypeId: this.telemetryParams.actionTypeId,
      model: this.telemetryParams.model,
      validated: run.name === SUCCESS_REPORT_NODE,
    };

    this.logger.debug(
      () => `Invoke ${eventType} telemetry:\n${JSON.stringify(telemetryValue, null, 2)}`
    );

    this.telemetry.reportEvent(eventType, telemetryValue);
  }

  protected async persistRun(_run: Run): Promise<void> {}
}
