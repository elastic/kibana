/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import {
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_COVERAGE_ID,
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
  SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID,
  SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
  SYSTEM_SECURITY_WORKER_FORENSICS_ENDPOINT_ANALYSIS_ID,
  SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID,
  type WorkerBlockingReason,
} from '@kbn/alertzero-common';
import {
  getBlockedAfterSaveNotices,
  getDisableConfirmation,
  getWorkerWarningReasons,
} from './worker_dependencies';

const HUNT = SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID;
const RULE_COVERAGE = SYSTEM_SECURITY_WORKER_DETECTION_RULE_COVERAGE_ID;
const ATTACK_DISCOVERY = SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID;
const ENDPOINT_ANALYSIS = SYSTEM_SECURITY_WORKER_FORENSICS_ENDPOINT_ANALYSIS_ID;

const enabledById = (entries: Record<string, boolean>) => new Map(Object.entries(entries));

const messages = (reasons: Array<{ message: React.ReactNode }>) =>
  reasons.map((reason) => reason.message);

const ids = (reasons: Array<{ id: string }>) => reasons.map((reason) => reason.id);

const subject = (id: string, blockingReasons: WorkerBlockingReason[] = []) => ({
  id,
  blockingReasons,
});

/** Saved Workers as the server returns them, on or off as `enabledAfterSave` says. */
const saved = (
  enabledAfterSave: Map<string, boolean>,
  workerIds: string[],
  blockingReasons: WorkerBlockingReason[] = []
) =>
  workerIds.map((id) => ({
    id,
    enabled: enabledAfterSave.get(id) === true,
    blockingReasons,
  }));

describe('getDisableConfirmation', () => {
  it.each([
    ['Continuous Threat Hunt', HUNT, RULE_COVERAGE],
    ['Attack Discovery', ATTACK_DISCOVERY, ENDPOINT_ANALYSIS],
    ['Endpoint Analysis', ENDPOINT_ANALYSIS, ATTACK_DISCOVERY],
  ])('asks before turning off %s while its dependent is enabled', (name, provider, dependent) => {
    const confirmation = getDisableConfirmation(
      provider,
      enabledById({ [provider]: true, [dependent]: true })
    );

    expect(confirmation?.title).toBe(`Disable ${name}?`);
    expect(confirmation?.paragraphs.map(({ id }) => id)).toEqual([dependent]);
  });

  it('names the dependent in the dialog body', () => {
    const confirmation = getDisableConfirmation(
      HUNT,
      enabledById({ [HUNT]: true, [RULE_COVERAGE]: true })
    );
    render(<I18nProvider>{confirmation?.paragraphs[0].message}</I18nProvider>);

    expect(screen.getByText('Rule Coverage', { selector: 'strong' })).toBeInTheDocument();
  });

  it("says Attack Discovery's handoffs won't be analyzed when Endpoint Analysis is turned off", () => {
    const confirmation = getDisableConfirmation(
      ENDPOINT_ANALYSIS,
      enabledById({ [ENDPOINT_ANALYSIS]: true, [ATTACK_DISCOVERY]: true })
    );
    const { container } = render(
      <I18nProvider>{confirmation?.paragraphs[0].message}</I18nProvider>
    );

    expect(container).toHaveTextContent(
      "Attack Discovery is enabled and hands attacks it can't rule out as false positives to this Worker. While Endpoint Analysis is off, those handoffs aren't analyzed and their Investigations stay open."
    );
  });

  it('does not ask when every dependent is off', () => {
    expect(
      getDisableConfirmation(HUNT, enabledById({ [HUNT]: true, [RULE_COVERAGE]: false }))
    ).toBeUndefined();
  });

  it('does not ask when the dependent is not registered', () => {
    expect(getDisableConfirmation(HUNT, enabledById({ [HUNT]: true }))).toBeUndefined();
  });

  it('does not ask for a Worker nothing depends on', () => {
    expect(
      getDisableConfirmation(
        SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID,
        enabledById({
          [SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID]: true,
          [SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID]: true,
        })
      )
    ).toBeUndefined();
  });

  it('does not treat the dependent as a provider', () => {
    expect(
      getDisableConfirmation(RULE_COVERAGE, enabledById({ [HUNT]: true, [RULE_COVERAGE]: true }))
    ).toBeUndefined();
  });
});

describe('getWorkerWarningReasons', () => {
  const warnings = (worker: ReturnType<typeof subject>, state: Map<string, boolean>) =>
    getWorkerWarningReasons(worker, state, { includeBlocking: true });

  it('warns the dependent while its provider is off, whether or not the dependent is on', () => {
    for (const dependentEnabled of [true, false]) {
      const state = enabledById({ [HUNT]: false, [RULE_COVERAGE]: dependentEnabled });
      expect(messages(warnings(subject(RULE_COVERAGE), state))).toEqual([
        'Continuous Threat Hunt is disabled — no gap signals to act on.',
      ]);
    }
  });

  it('warns the provider while it is off and its dependent is enabled', () => {
    expect(
      messages(warnings(subject(HUNT), enabledById({ [HUNT]: false, [RULE_COVERAGE]: true })))
    ).toEqual(['Rule Coverage is enabled but has no gap signals while this Worker is off.']);
  });

  it('does not warn the provider when its dependent is off too', () => {
    expect(warnings(subject(HUNT), enabledById({ [HUNT]: false, [RULE_COVERAGE]: false }))).toEqual(
      []
    );
  });

  it('warns nobody while the provider is on', () => {
    const state = enabledById({ [HUNT]: true, [RULE_COVERAGE]: true });
    expect(warnings(subject(HUNT), state)).toEqual([]);
    expect(warnings(subject(RULE_COVERAGE), state)).toEqual([]);
  });

  it('does not warn the dependent when the provider is not registered', () => {
    expect(warnings(subject(RULE_COVERAGE), enabledById({ [RULE_COVERAGE]: true }))).toEqual([]);
  });

  it('leaves the no-model reason out for users who cannot change Workers', () => {
    const state = enabledById({ [HUNT]: false, [RULE_COVERAGE]: true });

    expect(
      ids(
        getWorkerWarningReasons(subject(RULE_COVERAGE, ['no_model']), state, {
          includeBlocking: false,
        })
      )
    ).toEqual([`blockedBy:${HUNT}`]);
  });

  it('puts the no-model reason ahead of a dependency reason', () => {
    const state = enabledById({ [HUNT]: false, [RULE_COVERAGE]: true });

    expect(ids(warnings(subject(RULE_COVERAGE, ['no_model']), state))).toEqual([
      'no_model',
      `blockedBy:${HUNT}`,
    ]);
  });

  it('gives the header a plain-text no-model reason, since its tooltip cannot hold a link', () => {
    const [noModel] = warnings(
      subject(RULE_COVERAGE, ['no_model']),
      enabledById({ [RULE_COVERAGE]: false })
    );

    expect(noModel.message).toBe(
      'Some AI-powered steps in this Worker may not be configured. Check Feature settings below.'
    );
  });

  it('uses the Attack Discovery → Endpoint Analysis copy', () => {
    const state = enabledById({ [ATTACK_DISCOVERY]: false, [ENDPOINT_ANALYSIS]: true });

    expect(messages(warnings(subject(ENDPOINT_ANALYSIS), state))).toEqual([
      'Attack Discovery is disabled — no attacks are handed off for analysis.',
    ]);
    expect(messages(warnings(subject(ATTACK_DISCOVERY), state))).toEqual([
      'Endpoint Analysis is enabled but has nothing to analyze while this Worker is off.',
    ]);
  });

  it('uses the Endpoint Analysis → Attack Discovery copy', () => {
    const state = enabledById({ [ENDPOINT_ANALYSIS]: false, [ATTACK_DISCOVERY]: true });

    expect(messages(getWorkerWarningReasons(ATTACK_DISCOVERY, state))).toEqual([
      "Endpoint Analysis is disabled — attacks handed off for analysis aren't analyzed.",
    ]);
    expect(messages(getWorkerWarningReasons(ENDPOINT_ANALYSIS, state))).toEqual([
      "Attack Discovery is enabled but its handoffs aren't analyzed while this Worker is off.",
    ]);
  });
});

describe('getBlockedAfterSaveNotices', () => {
  const bothOff = enabledById({ [HUNT]: false, [RULE_COVERAGE]: false });
  const huntOffRuleCreationOn = enabledById({ [HUNT]: false, [RULE_COVERAGE]: true });

  it('notifies for a Worker the save turned on that is still blocked', () => {
    const notices = getBlockedAfterSaveNotices(
      bothOff,
      huntOffRuleCreationOn,
      saved(huntOffRuleCreationOn, [RULE_COVERAGE])
    );

    expect(notices.map(({ workerId }) => workerId)).toEqual([RULE_COVERAGE]);
    expect(messages(notices[0].reasons)).toEqual([
      'Continuous Threat Hunt is disabled — no gap signals to act on.',
    ]);
  });

  it('notifies when the save turns Attack Discovery on while Endpoint Analysis is off', () => {
    const notices = getBlockedAfterSaveNotices(
      enabledById({ [ATTACK_DISCOVERY]: false, [ENDPOINT_ANALYSIS]: false }),
      enabledById({ [ATTACK_DISCOVERY]: true, [ENDPOINT_ANALYSIS]: false }),
      [ATTACK_DISCOVERY]
    );

    expect(notices.map(({ workerId }) => workerId)).toEqual([ATTACK_DISCOVERY]);
    expect(messages(notices[0].reasons)).toEqual([
      "Endpoint Analysis is disabled — attacks handed off for analysis aren't analyzed.",
    ]);
  });

  it('skips a Worker that was already enabled, so a settings-only save stays quiet', () => {
    expect(
      getBlockedAfterSaveNotices(
        huntOffRuleCreationOn,
        huntOffRuleCreationOn,
        saved(huntOffRuleCreationOn, [RULE_COVERAGE])
      )
    ).toEqual([]);
  });

  it('skips a Worker that is off after the save', () => {
    expect(
      getBlockedAfterSaveNotices(
        enabledById({ [HUNT]: true, [RULE_COVERAGE]: true }),
        huntOffRuleCreationOn,
        saved(huntOffRuleCreationOn, [HUNT])
      )
    ).toEqual([]);
  });

  it('reports no model after any save of a Worker that is on, including a settings-only save', () => {
    const state = enabledById({ [HUNT]: true, [RULE_COVERAGE]: true });

    const notices = getBlockedAfterSaveNotices(
      state,
      state,
      saved(state, [RULE_COVERAGE], ['no_model'])
    );

    expect(notices).toEqual([
      { workerId: RULE_COVERAGE, reasons: [expect.objectContaining({ id: 'no_model' })] },
    ]);
  });

  it('does not report no model for a Worker that is off after the save', () => {
    const state = enabledById({ [HUNT]: true, [RULE_COVERAGE]: false });

    expect(
      getBlockedAfterSaveNotices(state, state, saved(state, [RULE_COVERAGE], ['no_model']))
    ).toEqual([]);
  });

  it('skips a Worker that was not saved in this round', () => {
    expect(getBlockedAfterSaveNotices(bothOff, huntOffRuleCreationOn, [])).toEqual([]);
  });

  it('skips a Worker the save turned on that is not blocked', () => {
    expect(
      getBlockedAfterSaveNotices(
        enabledById({ [HUNT]: true, [RULE_COVERAGE]: false }),
        enabledById({ [HUNT]: true, [RULE_COVERAGE]: true }),
        saved(enabledById({ [HUNT]: true, [RULE_COVERAGE]: true }), [RULE_COVERAGE])
      )
    ).toEqual([]);
  });
});
