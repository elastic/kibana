/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import type { KbnClient, ScoutLogger } from '@kbn/scout-security';

/**
 * The Alert Triage worker's prerequisite, applied at runtime rather than as a
 * `--uiSettings.overrides.*` server arg so it can be restored when the run ends (an override
 * would also pin it read-only for every other suite on the stack). The setting is registered
 * `readonly: true`, which only guards the settings UI; `POST internal/kibana/settings` accepts it.
 */
const KIBANA_SETTINGS_PATH = 'internal/kibana/settings';
const ALERT_ANALYSIS_SETTING = 'securitySolution:alertAnalysisWorkflowEnabled';

/** Outside `test-artifacts`: Playwright empties its output dir at the start of every run. */
const STATE_FILE = resolve(__dirname, '..', '.scout', 'runtime_settings', 'alertzero_api.json');

const writeSettings = async (
  kbnClient: KbnClient,
  changes: Record<string, unknown>
): Promise<void> => {
  await kbnClient.request({
    method: 'POST',
    path: KIBANA_SETTINGS_PATH,
    description: 'write advanced settings in the default space',
    body: { changes },
  });
};

/**
 * Captures the setting's user value (absent -> `null`) for the teardown project, then turns it on.
 * An existing capture file comes from a run that never reached teardown and holds the real
 * baseline, so it is kept.
 */
export const applyAlertAnalysisSetting = async ({
  kbnClient,
  log,
}: {
  kbnClient: KbnClient;
  log: ScoutLogger;
}): Promise<void> => {
  if (existsSync(STATE_FILE)) {
    log.warning(`[setup] keeping prior-value capture left by an interrupted run: ${STATE_FILE}`);
  } else {
    const { data } = await kbnClient.request<{
      settings?: Record<string, { userValue?: unknown }>;
    }>({ method: 'GET', path: KIBANA_SETTINGS_PATH, description: 'read advanced settings' });
    const prior = {
      [ALERT_ANALYSIS_SETTING]: data.settings?.[ALERT_ANALYSIS_SETTING]?.userValue ?? null,
    };
    mkdirSync(dirname(STATE_FILE), { recursive: true });
    writeFileSync(STATE_FILE, JSON.stringify(prior, null, 2));
  }
  await writeSettings(kbnClient, { [ALERT_ANALYSIS_SETTING]: true });
};

/** Restores the captured value. A missing capture file is not an error. */
export const restoreAlertAnalysisSetting = async ({
  kbnClient,
  log,
}: {
  kbnClient: KbnClient;
  log: ScoutLogger;
}): Promise<void> => {
  if (!existsSync(STATE_FILE)) {
    log.warning(`[teardown] no prior-value capture at ${STATE_FILE}; leaving the setting as it is`);
    return;
  }
  await writeSettings(kbnClient, JSON.parse(readFileSync(STATE_FILE, 'utf8')));
  rmSync(STATE_FILE, { force: true });
};
