/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { of } from 'rxjs';
import { coreMock } from '@kbn/core/public/mocks';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { WORKFLOWS_UI_SHOW_MANAGED_WORKFLOWS_SETTING_ID } from '@kbn/workflows';
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
  {
    showManagedWorkflows = true,
    canChangeAdvancedSettings = true,
  }: { showManagedWorkflows?: boolean; canChangeAdvancedSettings?: boolean } = {}
) => {
  const core = coreMock.createStart();
  core.application.getUrlForApp.mockImplementation(
    (appId: string, options?: { path?: string }) => `/app/${appId}${options?.path ?? ''}`
  );
  core.settings.client.get.mockReturnValue(showManagedWorkflows);
  core.settings.client.get$.mockReturnValue(of(showManagedWorkflows));
  core.application.capabilities = {
    ...core.application.capabilities,
    advancedSettings: { show: true, save: canChangeAdvancedSettings },
  };

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
  ])(
    'offers the managed workflows setting instead of the workflow when it is off (%s)',
    (_layout, isAccordion) => {
      renderPanel(WORKFLOW_ID, isAccordion, { showManagedWorkflows: false });

      const link = screen.getByTestId(`alertZeroWorkerViewExecutions-${WORKER_ID}`);
      expect(link).not.toHaveAttribute('href');

      fireEvent.click(link);

      expect(
        screen.getByText(
          'Execution history lives in Managed workflows, which is turned off for this space.'
        )
      ).toBeInTheDocument();
      expect(
        screen.getByTestId(`alertZeroWorkerViewExecutions-${WORKER_ID}-open-advanced-settings`)
      ).toHaveAttribute(
        'href',
        `/app/management/kibana/settings?query=${WORKFLOWS_UI_SHOW_MANAGED_WORKFLOWS_SETTING_ID}`
      );
    }
  );

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
