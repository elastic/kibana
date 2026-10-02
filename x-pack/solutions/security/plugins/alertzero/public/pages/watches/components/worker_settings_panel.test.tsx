/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { coreMock } from '@kbn/core/public/mocks';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import {
  SYSTEM_SECURITY_WATCH_DETECTION_ID,
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
  type Worker,
} from '@kbn/alertzero-common';
import { WorkerSettingsPanel } from './worker_settings_panel';
import { getModelWarningReasons } from './worker_model_reasons';

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
  blockingReasons: [],
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
  blockingReasons: Worker['blockingReasons'] = []
) => {
  const worker: Worker = { ...createWorker(workflowId), blockingReasons };
  const core = coreMock.createStart();
  core.application.getUrlForApp.mockImplementation(
    (appId: string, options?: { path?: string }) => `/app/${appId}${options?.path ?? ''}`
  );

  render(
    <I18nProvider>
      <KibanaContextProvider services={core}>
        <WorkerSettingsPanel
          worker={worker}
          isAccordion={isAccordion}
          isExpanded
          onToggle={jest.fn()}
          enabled
          settings={createWorker(workflowId).settings}
          warningReasons={getModelWarningReasons(worker)}
          settingsLocked={false}
          isSaving={false}
          canWrite
          onEnabledChange={jest.fn()}
          onSettingsChange={jest.fn()}
        />
      </KibanaContextProvider>
    </I18nProvider>
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

describe('WorkerSettingsPanel models and no-model block', () => {
  it('points the Models row at Feature settings', () => {
    const core = renderPanel(WORKFLOW_ID, false);

    expect(screen.getByTestId(`alertZeroModelsRow-${WORKER_ID}`)).toHaveTextContent(
      'This Worker uses models configured in Feature settings.'
    );
    const link = screen.getByTestId(`alertZeroModelsLink-${WORKER_ID}`);
    expect(link).toHaveAttribute('href', '/app/management/modelManagement/model_settings');

    fireEvent.click(link);

    expect(core.application.navigateToApp).toHaveBeenCalledWith('management', {
      path: '/modelManagement/model_settings',
    });
  });

  it('leaves the switch usable and shows no warning when nothing blocks the Worker', () => {
    renderPanel(WORKFLOW_ID, false);

    expect(screen.getByTestId(`alertZeroWorkerEnabledSwitch-${WORKER_ID}`)).toBeEnabled();
    expect(screen.queryByTestId(`alertZeroWorkerWarningIcon-${WORKER_ID}`)).not.toBeInTheDocument();
  });

  it.each([
    ['accordion', true],
    ['single-Worker', false],
  ])(
    'disables the switch, keeps its stored value, and explains why when the space has no model (%s)',
    async (_layout, isAccordion) => {
      renderPanel(WORKFLOW_ID, isAccordion, ['no_model']);

      const enabledSwitch = screen.getByTestId(`alertZeroWorkerEnabledSwitch-${WORKER_ID}`);
      expect(enabledSwitch).toBeDisabled();
      expect(enabledSwitch).toHaveAttribute('aria-checked', 'true');

      fireEvent.mouseOver(screen.getByTestId(`alertZeroWorkerWarningIcon-${WORKER_ID}`));
      const tooltip = await screen.findByRole('tooltip');

      expect(tooltip).toHaveTextContent(
        'Some AI-powered steps in this Worker may not be configured. Check Feature settings.'
      );
      expect(
        within(tooltip).getByTestId(`alertZeroWorkerNoModelLink-${WORKER_ID}`)
      ).toHaveAttribute('href', '/app/management/modelManagement/model_settings');
    }
  );
});
