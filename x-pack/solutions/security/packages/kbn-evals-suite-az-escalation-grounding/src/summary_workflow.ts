/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import { EscalationWorldSetupError } from './escalation_world';

const PUBLIC_API_VERSION = '2023-10-31';

const workflowUrl = (workflowId: string): string =>
  `/api/workflows/workflow/${encodeURIComponent(workflowId)}`;

const requestOptions = (method: 'GET' | 'PUT', body?: unknown) => ({
  method,
  version: PUBLIC_API_VERSION,
  headers: { 'elastic-api-version': PUBLIC_API_VERSION, 'kbn-xsrf': 'escalation-grounding-eval' },
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});

const setEnabled = (fetch: HttpHandler, workflowId: string, enabled: boolean) =>
  fetch(workflowUrl(workflowId), requestOptions('PUT', { enabled }));

/**
 * Makes sure the managed investigation-summary workflow is enabled for the run. It ships
 * `enabled: false`, and a disabled workflow never writes `metadata.summary`, so every
 * summary metric would read 0 for a reason that has nothing to do with the model.
 *
 * Throws when the workflow cannot be read or enabled (never scores a world without
 * summaries). Returns a function that puts the workflow back in the state it was found in.
 */
export const ensureWorkflowEnabled = async (
  fetch: HttpHandler,
  workflowId: string
): Promise<() => Promise<void>> => {
  let workflow: { enabled?: boolean };
  try {
    workflow = await fetch<{ enabled?: boolean }>(workflowUrl(workflowId), requestOptions('GET'));
  } catch (error) {
    throw new EscalationWorldSetupError(`read managed workflow ${workflowId}`, error);
  }
  if (workflow.enabled === true) {
    return async () => {};
  }
  try {
    await setEnabled(fetch, workflowId, true);
  } catch (error) {
    throw new EscalationWorldSetupError(`enable managed workflow ${workflowId}`, error);
  }
  return async () => {
    await setEnabled(fetch, workflowId, false);
  };
};

/**
 * Mirrors ALERTZERO_ENABLED_SETTING_ID (@kbn/alertzero-common). Inlined, like the inference
 * route constants, so this functional-tests package takes no runtime dependency on the plugin.
 */
export const ALERTZERO_ENABLED_SETTING_ID = 'securitySolution:enableAlertZero';

const UI_SETTINGS_ROUTE = '/internal/kibana/settings';

const uiSettingsOptions = (method: 'GET' | 'POST', body?: unknown) => ({
  method,
  headers: { 'kbn-xsrf': 'escalation-grounding-eval' },
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});

const writeAlertZeroSetting = (fetch: HttpHandler, value: boolean | null) =>
  fetch(
    UI_SETTINGS_ROUTE,
    uiSettingsOptions('POST', { changes: { [ALERTZERO_ENABLED_SETTING_ID]: value } })
  );

/**
 * Turns on the `securitySolution:enableAlertZero` uiSetting for the run's space. Agent Builder
 * only emits `ai.conversation.updated` when the AlertZero opt-in resolves true, and that opt-in
 * reads this namespace-scoped setting (default false). Without it the summary workflow never
 * fires, whatever its own `enabled` flag says.
 *
 * Throws when the setting cannot be read or written (never scores a world without the
 * trigger). Returns a function that puts the setting back: a user override is rewritten, an
 * unset setting is reset to its default (`null`).
 */
export const ensureAlertZeroEnabled = async (fetch: HttpHandler): Promise<() => Promise<void>> => {
  let settings: Record<string, { userValue?: unknown } | undefined> | undefined;
  try {
    ({ settings } = await fetch<{ settings?: typeof settings }>(
      UI_SETTINGS_ROUTE,
      uiSettingsOptions('GET')
    ));
  } catch (error) {
    throw new EscalationWorldSetupError(`read uiSetting ${ALERTZERO_ENABLED_SETTING_ID}`, error);
  }
  const previous = settings?.[ALERTZERO_ENABLED_SETTING_ID]?.userValue;
  if (previous === true) {
    return async () => {};
  }
  try {
    await writeAlertZeroSetting(fetch, true);
  } catch (error) {
    throw new EscalationWorldSetupError(`enable uiSetting ${ALERTZERO_ENABLED_SETTING_ID}`, error);
  }
  return async () => {
    await writeAlertZeroSetting(fetch, typeof previous === 'boolean' ? previous : null);
  };
};
