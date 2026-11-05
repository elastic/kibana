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

/** What setup persists for teardown: the baseline to restore and the value it wrote. */
interface AlertAnalysisCapture {
  prior: unknown;
  applied: unknown;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

// `prior` is a single user value here (possibly `null`), so only the keys are checked.
const isCapture = (value: unknown): value is AlertAnalysisCapture =>
  isRecord(value) && 'prior' in value && 'applied' in value;

/** The parsed file, or `undefined` when it cannot be read or is not JSON. */
const readCaptureFile = (): unknown => {
  try {
    return JSON.parse(readFileSync(STATE_FILE, 'utf8'));
  } catch {
    return undefined;
  }
};

const readUserValue = async (kbnClient: KbnClient): Promise<unknown> => {
  const { data } = await kbnClient.request<{
    settings?: Record<string, { userValue?: unknown }>;
  }>({ method: 'GET', path: KIBANA_SETTINGS_PATH, description: 'read advanced settings' });
  return data.settings?.[ALERT_ANALYSIS_SETTING]?.userValue ?? null;
};

/**
 * Captures the setting's user value (absent -> `null`) for the teardown project, then turns it on.
 * An existing capture file comes from a run that never reached teardown and holds the real
 * baseline, so it is kept.
 *
 * Ordering rule: the security_solution suite writes this setting too. When both setups run before
 * either teardown, the second one captures the first one's applied value as its baseline, so
 * teardown restores the setting only while it still holds what this suite applied.
 */
export const applyAlertAnalysisSetting = async ({
  kbnClient,
  log,
}: {
  kbnClient: KbnClient;
  log: ScoutLogger;
}): Promise<void> => {
  if (existsSync(STATE_FILE)) {
    const existing = readCaptureFile();
    if (isCapture(existing)) {
      log.warning(`[setup] keeping prior-value capture left by an interrupted run: ${STATE_FILE}`);
      // Teardown compares the live value with `applied`, so record what is about to be written.
      writeFileSync(STATE_FILE, JSON.stringify({ ...existing, applied: true }, null, 2));
    } else {
      // Neither writing over it nor applying without a baseline is safe, and returning would
      // leave every later run silently unconfigured: fail setup so the leftover gets resolved.
      throw new Error(
        `[setup] unreadable or older-format prior-value capture at ${STATE_FILE}: check the live value of ${ALERT_ANALYSIS_SETTING}, restore it if needed, then delete ${STATE_FILE}`
      );
    }
  } else {
    const capture: AlertAnalysisCapture = { prior: await readUserValue(kbnClient), applied: true };
    mkdirSync(dirname(STATE_FILE), { recursive: true });
    writeFileSync(STATE_FILE, JSON.stringify(capture, null, 2));
  }
  await writeSettings(kbnClient, { [ALERT_ANALYSIS_SETTING]: true });
};

/**
 * Restores the captured value while the setting still holds what this suite applied. A missing
 * capture file is not an error.
 */
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
  const capture = readCaptureFile();
  if (!isCapture(capture)) {
    log.warning(
      `[teardown] unreadable prior-value capture at ${STATE_FILE}; leaving the setting and the file as they are`
    );
    return;
  }
  const { prior, applied } = capture;
  if ((await readUserValue(kbnClient)) === applied) {
    await writeSettings(kbnClient, { [ALERT_ANALYSIS_SETTING]: prior });
  } else {
    log.warning(
      `[teardown] leaving ${ALERT_ANALYSIS_SETTING} as it is: it changed since setup (another suite owns it now)`
    );
  }
  rmSync(STATE_FILE, { force: true });
};
