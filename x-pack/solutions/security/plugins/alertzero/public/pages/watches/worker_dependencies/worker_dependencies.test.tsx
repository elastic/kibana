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
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_CREATION_ID,
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
  SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID,
  SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
  SYSTEM_SECURITY_WORKER_FORENSICS_ENDPOINT_ANALYSIS_ID,
  SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID,
} from '@kbn/alertzero-common';
import {
  getBlockedAfterSaveNotices,
  getDisableConfirmation,
  getWorkerWarningReasons,
} from './worker_dependencies';

const HUNT = SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID;
const RULE_CREATION = SYSTEM_SECURITY_WORKER_DETECTION_RULE_CREATION_ID;
const ATTACK_DISCOVERY = SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID;
const ENDPOINT_ANALYSIS = SYSTEM_SECURITY_WORKER_FORENSICS_ENDPOINT_ANALYSIS_ID;

const enabledById = (entries: Record<string, boolean>) => new Map(Object.entries(entries));

const messages = (reasons: Array<{ message: React.ReactNode }>) =>
  reasons.map((reason) => reason.message);

describe('getDisableConfirmation', () => {
  it.each([
    ['Continuous Threat Hunt', HUNT, RULE_CREATION],
    ['Attack Discovery', ATTACK_DISCOVERY, ENDPOINT_ANALYSIS],
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
      enabledById({ [HUNT]: true, [RULE_CREATION]: true })
    );
    render(<I18nProvider>{confirmation?.paragraphs[0].message}</I18nProvider>);

    expect(screen.getByText('Rule Creation', { selector: 'strong' })).toBeInTheDocument();
  });

  it('does not ask when every dependent is off', () => {
    expect(
      getDisableConfirmation(HUNT, enabledById({ [HUNT]: true, [RULE_CREATION]: false }))
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
      getDisableConfirmation(RULE_CREATION, enabledById({ [HUNT]: true, [RULE_CREATION]: true }))
    ).toBeUndefined();
  });
});

describe('getWorkerWarningReasons', () => {
  it('warns the dependent while its provider is off, whether or not the dependent is on', () => {
    for (const dependentEnabled of [true, false]) {
      const state = enabledById({ [HUNT]: false, [RULE_CREATION]: dependentEnabled });
      expect(messages(getWorkerWarningReasons(RULE_CREATION, state))).toEqual([
        'Continuous Threat Hunt is disabled — no gap signals to act on.',
      ]);
    }
  });

  it('warns the provider while it is off and its dependent is enabled', () => {
    expect(
      messages(getWorkerWarningReasons(HUNT, enabledById({ [HUNT]: false, [RULE_CREATION]: true })))
    ).toEqual(['Rule Creation is enabled but has no gap signals while this Worker is off.']);
  });

  it('does not warn the provider when its dependent is off too', () => {
    expect(
      getWorkerWarningReasons(HUNT, enabledById({ [HUNT]: false, [RULE_CREATION]: false }))
    ).toEqual([]);
  });

  it('warns nobody while the provider is on', () => {
    const state = enabledById({ [HUNT]: true, [RULE_CREATION]: true });
    expect(getWorkerWarningReasons(HUNT, state)).toEqual([]);
    expect(getWorkerWarningReasons(RULE_CREATION, state)).toEqual([]);
  });

  it('does not warn the dependent when the provider is not registered', () => {
    expect(getWorkerWarningReasons(RULE_CREATION, enabledById({ [RULE_CREATION]: true }))).toEqual(
      []
    );
  });

  it('uses the Attack Discovery → Endpoint Analysis copy', () => {
    const state = enabledById({ [ATTACK_DISCOVERY]: false, [ENDPOINT_ANALYSIS]: true });

    expect(messages(getWorkerWarningReasons(ENDPOINT_ANALYSIS, state))).toEqual([
      'Attack Discovery is disabled — no attacks are handed off for analysis.',
    ]);
    expect(messages(getWorkerWarningReasons(ATTACK_DISCOVERY, state))).toEqual([
      'Endpoint Analysis is enabled but has nothing to analyze while this Worker is off.',
    ]);
  });
});

describe('getBlockedAfterSaveNotices', () => {
  const bothOff = enabledById({ [HUNT]: false, [RULE_CREATION]: false });
  const huntOffRuleCreationOn = enabledById({ [HUNT]: false, [RULE_CREATION]: true });

  it('notifies for a Worker the save turned on that is still blocked', () => {
    const notices = getBlockedAfterSaveNotices(bothOff, huntOffRuleCreationOn, [RULE_CREATION]);

    expect(notices.map(({ workerId }) => workerId)).toEqual([RULE_CREATION]);
    expect(messages(notices[0].reasons)).toEqual([
      'Continuous Threat Hunt is disabled — no gap signals to act on.',
    ]);
  });

  it('skips a Worker that was already enabled, so a settings-only save stays quiet', () => {
    expect(
      getBlockedAfterSaveNotices(huntOffRuleCreationOn, huntOffRuleCreationOn, [RULE_CREATION])
    ).toEqual([]);
  });

  it('skips a Worker that is off after the save', () => {
    expect(
      getBlockedAfterSaveNotices(
        enabledById({ [HUNT]: true, [RULE_CREATION]: true }),
        huntOffRuleCreationOn,
        [HUNT]
      )
    ).toEqual([]);
  });

  it('skips a Worker that was not saved in this round', () => {
    expect(getBlockedAfterSaveNotices(bothOff, huntOffRuleCreationOn, [])).toEqual([]);
  });

  it('skips a Worker the save turned on that is not blocked', () => {
    expect(
      getBlockedAfterSaveNotices(
        enabledById({ [HUNT]: true, [RULE_CREATION]: false }),
        enabledById({ [HUNT]: true, [RULE_CREATION]: true }),
        [RULE_CREATION]
      )
    ).toEqual([]);
  });
});
