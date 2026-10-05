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
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { WORKFLOWS_UI_SHOW_MANAGED_WORKFLOWS_SETTING_ID } from '@kbn/workflows';
import { WorkflowsManagementUiActions } from '@kbn/workflows/common/privileges';
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

const FEATURE_SETTINGS_URL = '/app/management/modelManagement/model_settings';

const renderPanel = (
  workflowId: string | null,
  isAccordion: boolean,
  {
    enabled = true,
    showManagedWorkflows = true,
    canChangeAdvancedSettings = true,
    enableBlockedReason,
  }: {
    enabled?: boolean;
    showManagedWorkflows?: boolean;
    canChangeAdvancedSettings?: boolean;
    enableBlockedReason?: Worker['enableBlockedReason'];
  } = {}
) => {
  const core = coreMock.createStart();
  core.http.get.mockResolvedValue(undefined);
  core.application.getUrlForApp.mockImplementation(
    (appId: string, options?: { path?: string; deepLinkId?: string }) =>
      options?.deepLinkId === 'model_settings'
        ? FEATURE_SETTINGS_URL
        : `/app/${appId}${options?.path ?? ''}`
  );
  core.settings.client.get.mockReturnValue(showManagedWorkflows);
  core.settings.client.get$.mockReturnValue(of(showManagedWorkflows));
  core.application.capabilities = {
    ...core.application.capabilities,
    advancedSettings: { show: true, save: canChangeAdvancedSettings },
    workflowsManagement: { [WorkflowsManagementUiActions.readManagedExecution]: true },
  };

  render(
    <I18nProvider>
      <KibanaContextProvider services={core}>
        <WorkerSettingsPanel
          worker={{
            ...createWorker(workflowId),
            enabled,
            ...(enableBlockedReason ? { enableBlockedReason } : {}),
          }}
          isAccordion={isAccordion}
          isExpanded
          onToggle={jest.fn()}
          enabled={enabled}
          settings={createWorker(workflowId).settings}
          warningReasons={[]}
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
        `/app/management/kibana/settings?query=${encodeURIComponent(
          WORKFLOWS_UI_SHOW_MANAGED_WORKFLOWS_SETTING_ID
        )}`
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

describe('WorkerSettingsPanel models', () => {
  it.each([
    ['accordion', true],
    ['single-Worker', false],
  ])('points the Models row at Feature settings in a new tab (%s)', (_layout, isAccordion) => {
    const core = renderPanel(WORKFLOW_ID, isAccordion);

    expect(screen.getByTestId(`alertZeroModelsRow-${WORKER_ID}`)).toHaveTextContent(
      'This Worker uses models configured in Feature settings'
    );
    const link = screen.getByTestId(`alertZeroModelsLink-${WORKER_ID}`);
    expect(link).toHaveAttribute('href', FEATURE_SETTINGS_URL);
    expect(link).toHaveAttribute('target', '_blank');
    expect(core.application.getUrlForApp).toHaveBeenCalledWith('management', {
      deepLinkId: 'model_settings',
    });
  });
});

describe('WorkerSettingsPanel service account', () => {
  it('lets a worker without an account be turned on and shows no Run as control', () => {
    renderPanel(WORKFLOW_ID, false, { enabled: false });

    expect(screen.getByTestId(`alertZeroWorkerEnabledSwitch-${WORKER_ID}`)).not.toBeDisabled();
    expect(screen.queryByTestId(`alertZeroServiceAccountRow-${WORKER_ID}`)).not.toBeInTheDocument();
  });
});

describe('WorkerSettingsPanel header band title', () => {
  /*
   * Style contract, not layout: jsdom has no flexbox engine, so these assertions pin the CSS that
   * keeps the worker name on one line instead of stacking it (the accordion band hands width to the
   * trailing actions before the title). Reverting any one of them re-creates that regression.
   */
  it.each([
    ['accordion', true],
    ['single-Worker', false],
  ])('keeps the title on one line and lets the badge group wrap (%s)', (_layout, isAccordion) => {
    renderPanel(WORKFLOW_ID, isAccordion);

    const title = screen.getByText('Rule Tuning');
    // `white-space: nowrap` is the whole one-line guarantee: EuiTitle pins
    // `overflow-wrap: break-word !important`, so a `overflowWrap: normal` override here would be
    // dead CSS - only the nowrap declaration stops EUI from stacking the name.
    expect(title).toHaveStyleRule('white-space', 'nowrap');
    expect(title).toHaveStyleRule('overflow', 'hidden');
    expect(title).toHaveStyleRule('text-overflow', 'ellipsis');
    // An ellipsized name stays recoverable on hover.
    expect(title).toHaveAttribute('title', 'Rule Tuning');

    // The 100% clamp is what makes an over-long name ellipsize instead of overflowing the band.
    expect(title.closest('.euiFlexItem')).toHaveStyleRule('max-width', '100%');

    // The badge group wraps to its own line before the title gives up any width.
    expect(title.closest('.euiFlexGroup')).toHaveStyleRule('flex-wrap', 'wrap');
  });

  it('gives the accordion trigger min-width relief so the nowrap title cannot set its floor', () => {
    // EuiAccordion's trigger is a flex item left at `min-width: auto`, so the nowrap title's
    // min-content becomes its minimum size: without this relief the band cannot shrink and a long
    // name pushes the header past its panel instead of clipping.
    renderPanel(WORKFLOW_ID, true);

    const accordionButton = screen
      .getByTestId(`alertZeroWatchWorkerAccordion-${WORKER_ID}`)
      .querySelector('.euiAccordion__button');

    expect(accordionButton).toHaveStyleRule('min-width', '0');
  });
});

describe('WorkerSettingsPanel enable gating', () => {
  const switchId = `alertZeroWorkerEnabledSwitch-${WORKER_ID}`;

  it.each(['alertAnalysisRuntimeDisabled', 'alertAnalysisWorkflowDisabled'] as const)(
    'disables the switch of an off Worker when the server reports %s',
    (enableBlockedReason) => {
      renderPanel(WORKFLOW_ID, false, {
        enabled: false,
        enableBlockedReason,
        serviceAccountId: 'kibana/az-worker-1',
      });

      expect(screen.getByTestId(switchId)).toBeDisabled();
    }
  );

  // Gating an already-enabled Worker would trap users who cannot otherwise turn off a
  // Worker that is running without being able to triage.
  it('keeps the switch usable and warns when an enabled Worker is blocked', () => {
    renderPanel(WORKFLOW_ID, false, {
      enabled: true,
      enableBlockedReason: 'alertAnalysisRuntimeDisabled',
    });

    expect(screen.getByTestId(switchId)).not.toBeDisabled();
    expect(screen.getByTestId(`alertZeroWorkerWarningIcon-${WORKER_ID}`)).toBeInTheDocument();
  });

  it('leaves the switch usable when no reason is reported', () => {
    renderPanel(WORKFLOW_ID, false, { enabled: false, serviceAccountId: 'kibana/az-worker-1' });

    expect(screen.getByTestId(switchId)).not.toBeDisabled();
  });
});
