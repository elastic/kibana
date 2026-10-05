/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import {
  SYSTEM_SECURITY_WORKER_CATALOG,
  SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID,
  SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
  SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID,
} from '@kbn/alertzero-common';
import type { CatalogWorker } from './use_worker_selection';
import { WorkerSelectionRow } from './worker_selection_row';

const getWorker = (id: string): CatalogWorker => {
  const worker = SYSTEM_SECURITY_WORKER_CATALOG.find((entry) => entry.id === id);
  if (!worker) throw new Error(`Unknown worker ${id}`);
  return worker;
};

const renderRow = ({
  workerId,
  scheduleInterval,
  checked = true,
  disabled = false,
  onToggle = jest.fn(),
}: {
  workerId: string;
  scheduleInterval?: string;
  checked?: boolean;
  disabled?: boolean;
  onToggle?: jest.Mock;
}) => {
  render(
    <I18nProvider>
      <EuiProvider>
        <WorkerSelectionRow
          worker={getWorker(workerId)}
          scheduleInterval={scheduleInterval}
          checked={checked}
          disabled={disabled}
          onToggle={onToggle}
        />
      </EuiProvider>
    </I18nProvider>
  );
  return { onToggle };
};

describe('WorkerSelectionRow', () => {
  it('shows the cadence label when a schedule interval is provided', () => {
    renderRow({
      workerId: SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID,
      scheduleInterval: '4h',
    });
    expect(
      screen.getByTestId(
        `alertZeroOnboardingWorkerTrigger-${SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID}`
      )
    ).toHaveTextContent('Every 4 hours');
  });

  it('falls back to the event trigger label when there is no schedule interval', () => {
    renderRow({ workerId: SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID });
    expect(
      screen.getByTestId(
        `alertZeroOnboardingWorkerTrigger-${SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID}`
      )
    ).toHaveTextContent('On new alerts');
  });

  it('omits the trigger badge when neither a schedule nor an event trigger is known', () => {
    renderRow({ workerId: SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID });
    expect(
      screen.queryByTestId(
        `alertZeroOnboardingWorkerTrigger-${SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID}`
      )
    ).not.toBeInTheDocument();
  });

  it('describes the toggle with the worker description', () => {
    renderRow({ workerId: SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID });
    const toggle = screen.getByTestId(
      `alertZeroOnboardingWorkerToggle-${SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID}`
    );
    const describedBy = toggle.getAttribute('aria-describedby');
    expect(describedBy).toBe(
      `alertZeroOnboardingWorkerDescription-${SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID}`
    );
    expect(document.getElementById(describedBy as string)).toBeInTheDocument();
  });

  it('calls onToggle with the worker id and new checked state', () => {
    const { onToggle } = renderRow({
      workerId: SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID,
      checked: true,
    });
    fireEvent.click(
      screen.getByTestId(
        `alertZeroOnboardingWorkerToggle-${SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID}`
      )
    );
    expect(onToggle).toHaveBeenCalledWith(SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID, false);
  });

  it('disables the toggle when disabled is set', () => {
    renderRow({ workerId: SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID, disabled: true });
    expect(
      screen.getByTestId(
        `alertZeroOnboardingWorkerToggle-${SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID}`
      )
    ).toBeDisabled();
  });

  it('shows the workflows note only for Attack Discovery', () => {
    renderRow({ workerId: SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID });
    expect(screen.getByTestId('alertZeroOnboardingAttackDiscoveryNote')).toBeInTheDocument();
  });

  it('does not show the workflows note for other workers', () => {
    renderRow({ workerId: SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID });
    expect(screen.queryByTestId('alertZeroOnboardingAttackDiscoveryNote')).not.toBeInTheDocument();
  });
});
