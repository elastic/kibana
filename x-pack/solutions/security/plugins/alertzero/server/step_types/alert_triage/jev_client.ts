/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { JEV_ENDPOINT_ID } from '../../alert_triage/jev_first_line';

/** Asks the decision model the questions about one text. It returns the answers by name of question. */
export type JevDecide = (
  input: string,
  questions: Record<string, Record<string, unknown>>
) => Promise<Record<string, unknown>>;

/**
 * The call goes through Elasticsearch (`POST _inference/decision/<endpoint>`), which serves the endpoint through the Elastic Inference
 * Service, so Kibana needs no API key of its own. It uses the internal user: the service account of the worker has no inference
 * privilege. (shortcut: the privilege for the service account is not designed; do it before this runs outside a test.)
 */
export const makeJevDecide =
  (esClient: ElasticsearchClient, endpoint: string = JEV_ENDPOINT_ID): JevDecide =>
  async (input, questions) => {
    const response = await esClient.transport.request<{
      decision?: { answers?: Record<string, unknown> };
    }>({
      method: 'POST',
      path: `/_inference/decision/${encodeURIComponent(endpoint)}`,
      body: { input, task_settings: { questions } },
    });
    return response.decision?.answers ?? {};
  };
