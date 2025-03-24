/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { ObservabilityAIAssistantApiClient } from '../../../../services/observability_ai_assistant_api';

export async function createOrUpdateIndexAssets(
  observabilityAIAssistantAPIClient: ObservabilityAIAssistantApiClient
) {
  const { status } = await observabilityAIAssistantAPIClient.editor({
    endpoint: 'POST /internal/observability_ai_assistant/index_assets',
  });
  expect(status).to.be(200);
}
