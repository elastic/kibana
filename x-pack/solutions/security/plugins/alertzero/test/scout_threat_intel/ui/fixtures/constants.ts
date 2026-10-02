/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID,
  SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
} from '@kbn/alertzero-common';

export const FLOOR_WORKER_IDS = [
  SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID,
  SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
] as const;

export const FEATURE_SETTINGS_APP_URL = '/app/management/modelManagement/model_settings';

export const NO_MODEL_MESSAGE =
  'Some AI-powered steps in this Worker may not be configured. Check Feature settings.';
export const MODELS_ROW_MESSAGE = 'This Worker uses models configured in Feature settings.';

/** Stack connector types the inference plugin lists as chat models. */
export const LLM_CONNECTOR_TYPE_IDS = ['.gen-ai', '.bedrock', '.gemini', '.inference'];

/** Created only to give the space a model; never called, so the URL does not need to answer. */
export const UNREACHABLE_LLM_CONNECTOR = {
  name: 'scout-alertzero-no-model-block',
  connectorTypeId: '.gen-ai',
  config: {
    apiProvider: 'OpenAI',
    apiUrl: 'http://localhost:1/v1/chat/completions',
    defaultModel: 'gpt-4o',
  },
  secrets: { apiKey: 'scout-test-key' },
};
