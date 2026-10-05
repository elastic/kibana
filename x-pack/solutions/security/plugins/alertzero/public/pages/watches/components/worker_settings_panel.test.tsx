/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
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

const renderPanel = (
  workflowId: string | null,
  isAccordion: boolean,
  overrides: { enabled?: boolean; serviceAccountId?: string } = {}
) => {
  const core = coreMock.createStart();
  core.http.get.mockResolvedValue(undefined);
  core.application.getUrlForApp.mockImplementation(
    (appId: string, options?: { path?: string }) => `/app/${appId}${options?.path ?? ''}`
  );
  const settings = {
    ...createWorker(workflowId).settings,
    ...(overrides.serviceAccountId ? { serviceAccountId: overrides.serviceAccountId } : {}),
  };

  render(
    <KibanaContextProvider services={core}>
      <WorkerSettingsPanel
        worker={createWorker(workflowId)}
        isAccordion={isAccordion}
        isExpanded
        onToggle={jest.fn()}
        enabled={overrides.enabled ?? true}
        settings={settings}
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
  it('shows that saving an enabled worker requires a service account', () => {
    renderPanel(WORKFLOW_ID, false);

    expect(screen.getByTestId(`alertZeroServiceAccountRequired-${WORKER_ID}`)).toHaveTextContent(
      'Select a service account to save while this worker stays on. You can turn it off without one.'
    );
  });

  it('hides that notice when the worker is off', () => {
    renderPanel(WORKFLOW_ID, false, { enabled: false });

    expect(
      screen.queryByTestId(`alertZeroServiceAccountRequired-${WORKER_ID}`)
    ).not.toBeInTheDocument();
  });

  it('hides that notice when an account is selected', () => {
    renderPanel(WORKFLOW_ID, false, { serviceAccountId: 'kibana/az-worker-1' });

    expect(
      screen.queryByTestId(`alertZeroServiceAccountRequired-${WORKER_ID}`)
    ).not.toBeInTheDocument();
  });
});
