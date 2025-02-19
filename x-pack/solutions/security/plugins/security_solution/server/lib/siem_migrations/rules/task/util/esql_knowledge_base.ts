/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { naturalLanguageToEsql, type InferenceClient } from '@kbn/inference-plugin/server';
import { lastValueFrom } from 'rxjs';
import { TELEMETRY_SIEM_MIGRATION_ID } from './constants';

export class EsqlKnowledgeBase {
  constructor(
    private readonly connectorId: string,
    private readonly migrationId: string,
    private readonly client: InferenceClient,
    private readonly logger: Logger
  ) {}

  public async translate(input: string): Promise<string> {
    const { content } = await lastValueFrom(
      naturalLanguageToEsql({
        client: this.client,
        connectorId: this.connectorId,
        input,
        logger: this.logger,
        metadata: {
          connectorTelemetry: {
            pluginId: TELEMETRY_SIEM_MIGRATION_ID,
            aggregateBy: this.migrationId,
          },
        },
      })
    );
    return content;
  }
}
