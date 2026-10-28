/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject } from 'inversify';
import { remotable } from '@kbn/core-remote-common';
import { runBuildAlertEntityGraph } from '../workflows/step_types/build_alert_entity_graph_step/run_build_alert_entity_graph';
import type { BuildAlertEntityGraphInput } from '../workflows/step_types/build_alert_entity_graph_step/run_build_alert_entity_graph';
import { AlertGraphEsToken, type AlertGraphEsApi } from './tokens';

/** Executor-side step. Graph computation runs here; search runs on the coordinator. */
@remotable()
export class AlertGraphStep {
  constructor(@inject(AlertGraphEsToken) private readonly elasticsearch: AlertGraphEsApi) {}

  async run(scopeId: string, raw: unknown): Promise<{ output: unknown }> {
    const input = (raw as { with?: BuildAlertEntityGraphInput }).with;
    if (!input?.alertId || !input.alertIndex) {
      throw new Error('security.buildAlertEntityGraph requires alertId and alertIndex');
    }
    const esClient = await this.elasticsearch.forScope(scopeId);
    const output = await runBuildAlertEntityGraph({ esClient, input });
    return { output };
  }
}
