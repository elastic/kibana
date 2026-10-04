/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { coreMock } from '@kbn/core/public/mocks';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import {
  SYSTEM_SECURITY_WATCH_DETECTION_ID,
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
  type Worker,
} from '@kbn/alertzero-common';
import { WorkerSettingsPanel } from './worker_settings_panel';

const WORKER_ID = SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID;
/** Not `<workerId>-<spaceId>`, so a client that rebuilds that convention fails this test. */
const WORKFLOW_ID = 'opaque-installed-workflow';

const createWorker = (workflowId: string | null): Worker => ({
  id: WORKER_ID,
  name: 'Rule Tuning',
  watchIds: [SYSTEM_SECURITY_WATCH_DETECTION_ID],
  enabled: true,
  lastRun: null,
  state: 'ok',
  settingsRevision: 1,
  workflowId,
  settings: {
    workerId: WORKER_ID,
    autonomy: 'manual',
    scheduleInterval: '2h',
    extras: { analysisWindowDays: 14 },
  },
});

const renderPanel = (workflowId: string | null, isAccordion: boolean) => {
  const core = coreMock.createStart();
  core.application.getUrlForApp.mockImplementation(
    (appId: string, options?: { path?: string }) => `/app/${appId}${options?.path ?? ''}`
  );

  render(
    <KibanaContextProvider services={core}>
      <WorkerSettingsPanel
        worker={createWorker(workflowId)}
        isAccordion={isAccordion}
        isExpanded
        onToggle={jest.fn()}
        enabled
        settings={createWorker(workflowId).settings}
        warningReasons={[]}
        settingsLocked={false}
        isSaving={false}
        canWrite
        onEnabledChange={jest.fn()}
        onSettingsChange={jest.fn()}
      />
    </KibanaContextProvider>
  );

  return core;
};

describe('WorkerSettingsPanel view executions link', () => {
  it.each([
    ['accordion', true],
    ['single-Worker', false],
  ])('opens the installed workflow executions tab in a new tab (%s)', (_layout, isAccordion) => {
    const core = renderPanel(WORKFLOW_ID, isAccordion);

    const link = screen.getByTestId(`alertZeroWorkerViewExecutions-${WORKER_ID}`);
    const enabledSwitch = screen.getByTestId(`alertZeroWorkerEnabledSwitch-${WORKER_ID}`);

    expect(link).toHaveTextContent('View executions');
    expect(link).toHaveAttribute('aria-label', 'View executions for Rule Tuning');
    expect(link).toHaveAttribute('href', `/app/workflows/${WORKFLOW_ID}?tab=executions`);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    const markup = link.innerHTML;
    expect(markup.indexOf('View executions')).toBeGreaterThanOrEqual(0);
    expect(markup.indexOf('data-euiicon-type="external"')).toBeGreaterThan(
      markup.indexOf('View executions')
    );
    expect(link.parentElement?.nextElementSibling).toContainElement(enabledSwitch);
    expect(core.application.getUrlForApp).toHaveBeenCalledWith('workflows', {
      path: `/${WORKFLOW_ID}?tab=executions`,
    });
  });

  it.each([
    ['accordion', true],
    ['single-Worker', false],
  ])('omits the link when the per-space workflow is not installed (%s)', (_layout, isAccordion) => {
    renderPanel(null, isAccordion);

    expect(
      screen.queryByTestId(`alertZeroWorkerViewExecutions-${WORKER_ID}`)
    ).not.toBeInTheDocument();
    expect(screen.getByTestId(`alertZeroWorkerEnabledSwitch-${WORKER_ID}`)).toBeInTheDocument();
  });
});

describe('WorkerSettingsPanel service account', () => {
  const renderWithAccounts = () => {
    const onSettingsChange = jest.fn();
    const core = coreMock.createStart();
    core.security.serviceAccounts.isEnabled.mockReturnValue(true);
    core.http.get.mockResolvedValue({
      serviceAccounts: [
        { id: 'account-a', name: 'Reader', enabled: true, assumable: true, roles: ['reader'] },
        { id: 'account-b', name: 'Disabled', enabled: false, assumable: true, roles: ['reader'] },
      ],
    });

    render(
      <KibanaContextProvider services={core}>
        <WorkerSettingsPanel
          worker={createWorker(WORKFLOW_ID)}
          isAccordion={false}
          isExpanded
          onToggle={jest.fn()}
          enabled
          settings={createWorker(WORKFLOW_ID).settings}
          settingsLocked={false}
          isSaving={false}
          canWrite
          onEnabledChange={jest.fn()}
          onSettingsChange={onSettingsChange}
        />
      </KibanaContextProvider>
    );

    return { onSettingsChange };
  };

  it('hides the control when service accounts are disabled', () => {
    renderPanel(WORKFLOW_ID, false);

    expect(
      screen.queryByTestId(`alertZeroServiceAccountSelect-${WORKER_ID}`)
    ).not.toBeInTheDocument();
  });

  it('offers the current user and assumable accounts', async () => {
    renderWithAccounts();

    expect(await screen.findByRole('option', { name: 'Current user' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Reader' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Disabled' })).not.toBeInTheDocument();
  });

  it('writes the selected account id', async () => {
    const { onSettingsChange } = renderWithAccounts();
    const select = await screen.findByTestId(`alertZeroServiceAccountSelect-${WORKER_ID}`);

    fireEvent.change(select, { target: { value: 'account-a' } });

    expect(onSettingsChange).toHaveBeenCalledWith({ serviceAccountId: 'account-a' });
  });

  it('clears the account when the current user is selected', async () => {
    const onSettingsChange = jest.fn();
    const core = coreMock.createStart();
    core.security.serviceAccounts.isEnabled.mockReturnValue(true);
    core.http.get.mockResolvedValue({
      serviceAccounts: [
        { id: 'account-a', name: 'Reader', enabled: true, assumable: true, roles: ['reader'] },
      ],
    });
    const settings = { ...createWorker(WORKFLOW_ID).settings, serviceAccountId: 'account-a' };

    render(
      <KibanaContextProvider services={core}>
        <WorkerSettingsPanel
          worker={{ ...createWorker(WORKFLOW_ID), settings }}
          isAccordion={false}
          isExpanded
          onToggle={jest.fn()}
          enabled
          settings={settings}
          settingsLocked={false}
          isSaving={false}
          canWrite
          onEnabledChange={jest.fn()}
          onSettingsChange={onSettingsChange}
        />
      </KibanaContextProvider>
    );

    fireEvent.change(await screen.findByTestId(`alertZeroServiceAccountSelect-${WORKER_ID}`), {
      target: { value: '' },
    });

    await waitFor(() => {
      expect(onSettingsChange).toHaveBeenCalledWith({ serviceAccountId: null });
    });
  });
});
