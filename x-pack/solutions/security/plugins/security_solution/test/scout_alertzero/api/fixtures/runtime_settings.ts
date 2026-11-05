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
 * Advanced settings the AlertZero flows need, applied at runtime instead of through
 * `--uiSettings.overrides.*` server args: an override makes the setting read-only for every
 * suite on the stack, while a runtime write can be restored when the run ends.
 *
 * `securitySolution:alertAnalysisWorkflowEnabled` and `genAiSettings:defaultAIConnector` are
 * registered `readonly: true`, which only guards the settings UI; `POST internal/kibana/settings`
 * accepts both.
 */
const KIBANA_SETTINGS_PATH = 'internal/kibana/settings';

const AD_WORKFLOWS_SETTING = 'securitySolution:enableAttackDiscoveryWorkflows';
const CONTEXT_ENGINE_SETTING = 'contextEngine:enabled';
const AGENT_BUILDER_EXPERIMENTAL_SETTING = 'agentBuilder:experimentalFeatures';
const ALERT_ANALYSIS_SETTING = 'securitySolution:alertAnalysisWorkflowEnabled';
const DEFAULT_AI_CONNECTOR_SETTING = 'genAiSettings:defaultAIConnector';

/** The suites run in the default space, so the settings are written there. */
const SETTINGS_SPACE = 'default';

/** Outside `test-artifacts`: Playwright empties its output dir at the start of every run. */
const STATE_DIR = resolve(__dirname, '..', '.scout', 'runtime_settings');

/** Settings the suite turns on, plus the connector pin when `ALERTZERO_E2E_AI_CONNECTOR` is set. */
export const getRuntimeSettingChanges = (
  env: NodeJS.ProcessEnv = process.env
): Record<string, boolean | string> => {
  const pinnedConnectorId = env.ALERTZERO_E2E_AI_CONNECTOR?.trim();
  return {
    [AD_WORKFLOWS_SETTING]: true,
    [CONTEXT_ENGINE_SETTING]: true,
    [AGENT_BUILDER_EXPERIMENTAL_SETTING]: true,
    [ALERT_ANALYSIS_SETTING]: true,
    ...(pinnedConnectorId ? { [DEFAULT_AI_CONNECTOR_SETTING]: pinnedConnectorId } : {}),
  };
};

type SettingValues = Record<string, unknown>;

/** What a suite persists for its teardown: the baseline to restore and the values it wrote. */
interface RuntimeSettingsCapture {
  prior: SettingValues;
  applied: SettingValues;
}

const stateFile = (suiteKey: string): string =>
  resolve(STATE_DIR, `runtime_settings_${suiteKey}.json`);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isCapture = (value: unknown): value is RuntimeSettingsCapture =>
  isRecord(value) && isRecord(value.prior) && isRecord(value.applied);

/** The parsed file, or `undefined` when it cannot be read or is not JSON. */
const readCaptureFile = (file: string): unknown => {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return undefined;
  }
};

const readUserValues = async (kbnClient: KbnClient): Promise<Record<string, unknown>> => {
  const { data } = await kbnClient.request<{
    settings?: Record<string, { userValue?: unknown }>;
  }>({ method: 'GET', path: KIBANA_SETTINGS_PATH, description: 'read advanced settings' });
  return Object.fromEntries(
    Object.entries(data.settings ?? {}).map(([key, value]) => [key, value?.userValue])
  );
};

const writeSettings = async (
  kbnClient: KbnClient,
  changes: Record<string, unknown>
): Promise<void> => {
  await kbnClient.request({
    method: 'POST',
    path: KIBANA_SETTINGS_PATH,
    description: `write advanced settings in the ${SETTINGS_SPACE} space`,
    body: { changes },
  });
};

/**
 * Captures the user value of each setting (absent -> `null`), persists it for the teardown project,
 * then applies the changes. Setup and teardown run as separate Playwright projects, so the prior
 * values travel through a file keyed by suite.
 *
 * An existing capture file is left alone: it comes from a run that never reached teardown, and
 * its values are the real baseline, while the live ones are that run's leftovers.
 *
 * Ordering rule: the AlertZero plugin suite writes `alertAnalysisWorkflowEnabled` too. When both
 * setups run before either teardown, the second one captures the first one's applied value as its
 * baseline, so each teardown restores a setting only while it still holds what that suite applied.
 */
export const applyRuntimeSettings = async ({
  kbnClient,
  log,
  suiteKey,
  changes = getRuntimeSettingChanges(),
}: {
  kbnClient: KbnClient;
  log: ScoutLogger;
  suiteKey: string;
  changes?: Record<string, boolean | string>;
}): Promise<void> => {
  const file = stateFile(suiteKey);
  if (existsSync(file)) {
    const existing = readCaptureFile(file);
    let capture: RuntimeSettingsCapture;
    if (isCapture(existing)) {
      log.warning(`[setup] keeping prior-value capture left by an interrupted run: ${file}`);
      capture = existing;
    } else {
      // Neither writing over it nor applying without a baseline is safe, and returning would
      // leave every later run silently unconfigured: fail setup so the leftover gets resolved.
      throw new Error(
        `[setup] unreadable or older-format prior-value capture at ${file}: check the live values of ${Object.keys(
          changes
        ).join(', ')}, restore them if needed, then delete ${file}`
      );
    }
    // A setting the interrupted run did not write has no baseline in the capture yet, and its
    // live value is still the user's own, so capture it now or teardown would never revert it.
    const uncaptured = Object.keys(changes).filter((key) => !(key in capture.prior));
    if (uncaptured.length > 0) {
      const current = await readUserValues(kbnClient);
      capture = {
        prior: {
          ...capture.prior,
          ...Object.fromEntries(uncaptured.map((key) => [key, current[key] ?? null])),
        },
        applied: capture.applied,
      };
      log.warning(
        `[setup] captured settings missing from the kept capture: ${uncaptured.join(', ')}`
      );
    }
    // Teardown restores a setting only while it still holds what this suite applied, so the
    // capture has to record the values about to be written now, not the interrupted run's.
    capture = { ...capture, applied: { ...capture.applied, ...changes } };
    writeFileSync(file, JSON.stringify(capture, null, 2));
  } else {
    const current = await readUserValues(kbnClient);
    const capture: RuntimeSettingsCapture = {
      prior: Object.fromEntries(Object.keys(changes).map((key) => [key, current[key] ?? null])),
      applied: changes,
    };
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, JSON.stringify(capture, null, 2));
  }
  await writeSettings(kbnClient, changes);
  log.debug(`[setup] applied runtime settings: ${Object.keys(changes).join(', ')}`);
};

/**
 * Restores the values `applyRuntimeSettings` captured, for the settings that still hold the value
 * this suite applied. A missing capture file is not an error.
 */
export const restoreRuntimeSettings = async ({
  kbnClient,
  log,
  suiteKey,
}: {
  kbnClient: KbnClient;
  log: ScoutLogger;
  suiteKey: string;
}): Promise<void> => {
  const file = stateFile(suiteKey);
  if (!existsSync(file)) {
    log.warning(`[teardown] no prior-value capture at ${file}; leaving the settings as they are`);
    return;
  }
  const capture = readCaptureFile(file);
  if (!isCapture(capture)) {
    log.warning(
      `[teardown] unreadable prior-value capture at ${file}; leaving the settings and the file as they are`
    );
    return;
  }
  const { prior, applied } = capture;
  const current = await readUserValues(kbnClient);
  const restorable = Object.keys(prior).filter((key) => current[key] === applied[key]);
  const skipped = Object.keys(prior).filter((key) => !restorable.includes(key));
  if (skipped.length > 0) {
    log.warning(
      `[teardown] leaving settings changed since setup (another suite owns them now): ${skipped.join(
        ', '
      )}`
    );
  }
  if (restorable.length > 0) {
    await writeSettings(kbnClient, Object.fromEntries(restorable.map((key) => [key, prior[key]])));
  }
  rmSync(file, { force: true });
  log.debug(`[teardown] restored runtime settings: ${restorable.join(', ')}`);
};
