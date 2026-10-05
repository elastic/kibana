/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { of } from 'rxjs';
import { coreMock } from '@kbn/core/public/mocks';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { WORKFLOWS_UI_SHOW_MANAGED_WORKFLOWS_SETTING_ID } from '@kbn/workflows';
import { ViewExecutionsLink } from './view_executions_link';

const WORKER_ID = 'worker-1';
const WORKER_NAME = 'Rule Tuning';
const EXECUTIONS_HREF = '/app/workflows/opaque-installed-workflow?tab=executions';
const LINK_TEST_SUBJ = `alertZeroWorkerViewExecutions-${WORKER_ID}`;
const POPOVER_BODY =
  'Execution history lives in Managed workflows, which is turned off for this space.';
const REQUIRED_TOOLTIP =
  'Requires Managed workflows. Ask an admin to enable it in Advanced Settings.';
const ADVANCED_SETTINGS_HREF = `/app/management/kibana/settings?query=${encodeURIComponent(
  WORKFLOWS_UI_SHOW_MANAGED_WORKFLOWS_SETTING_ID
)}`;

const renderLink = ({
  showManagedWorkflows,
  canChangeAdvancedSettings,
}: {
  showManagedWorkflows: boolean;
  canChangeAdvancedSettings?: boolean;
}) => {
  const core = coreMock.createStart();
  core.application.getUrlForApp.mockImplementation(
    (appId: string, options?: { path?: string }) => `/app/${appId}${options?.path ?? ''}`
  );
  core.settings.client.get.mockReturnValue(showManagedWorkflows);
  core.settings.client.get$.mockReturnValue(of(showManagedWorkflows));
  if (canChangeAdvancedSettings === undefined) {
    // A space can grant no advancedSettings capability at all, which the component
    // deliberately folds into the "cannot change it" branch via `!== true`.
    const withoutAdvancedSettings = { ...core.application.capabilities };
    delete (withoutAdvancedSettings as { advancedSettings?: unknown }).advancedSettings;
    core.application.capabilities = withoutAdvancedSettings;
  } else {
    core.application.capabilities = {
      ...core.application.capabilities,
      advancedSettings: { show: true, save: canChangeAdvancedSettings },
    };
  }

  render(
    <KibanaContextProvider services={core}>
      <ViewExecutionsLink
        workerId={WORKER_ID}
        workerName={WORKER_NAME}
        executionsHref={EXECUTIONS_HREF}
      />
    </KibanaContextProvider>
  );

  return core;
};

describe('ViewExecutionsLink', () => {
  it('opens the workflow executions tab in a new tab when managed workflows are shown', () => {
    renderLink({ showManagedWorkflows: true, canChangeAdvancedSettings: true });

    const link = screen.getByTestId(LINK_TEST_SUBJ);
    expect(link).toHaveTextContent('View executions');
    expect(link).toHaveAttribute('aria-label', `View executions for ${WORKER_NAME}`);
    expect(link).toHaveAttribute('href', EXECUTIONS_HREF);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('explains the hidden setting and offers Advanced Settings to users who can change it', () => {
    const core = renderLink({ showManagedWorkflows: false, canChangeAdvancedSettings: true });

    const link = screen.getByTestId(LINK_TEST_SUBJ);
    expect(link).not.toHaveAttribute('href');
    expect(screen.queryByText(POPOVER_BODY)).not.toBeInTheDocument();

    fireEvent.click(link);

    expect(screen.getByText('Managed workflows are turned off')).toBeInTheDocument();
    expect(screen.getByText(POPOVER_BODY)).toBeInTheDocument();
    expect(screen.getByText('Not now')).toBeInTheDocument();
    expect(screen.getByText('Open Advanced Settings')).toBeInTheDocument();
    expect(core.application.getUrlForApp).toHaveBeenCalledWith('management', {
      path: `/kibana/settings?query=${encodeURIComponent(
        WORKFLOWS_UI_SHOW_MANAGED_WORKFLOWS_SETTING_ID
      )}`,
    });
    expect(screen.getByTestId(`${LINK_TEST_SUBJ}-open-advanced-settings`)).toHaveAttribute(
      'href',
      ADVANCED_SETTINGS_HREF
    );
  });

  it('dismisses the popover without navigating', async () => {
    renderLink({ showManagedWorkflows: false, canChangeAdvancedSettings: true });

    fireEvent.click(screen.getByTestId(LINK_TEST_SUBJ));
    expect(screen.getByText(POPOVER_BODY)).toBeInTheDocument();

    fireEvent.click(screen.getByTestId(`${LINK_TEST_SUBJ}-not-now`));

    // EUI keeps the panel mounted until its close transition elapses.
    await waitFor(() => expect(screen.queryByText(POPOVER_BODY)).not.toBeInTheDocument());
  });

  it('disables the link and states the requirement to users who cannot change the setting', async () => {
    renderLink({ showManagedWorkflows: false, canChangeAdvancedSettings: false });

    const link = screen.getByTestId(LINK_TEST_SUBJ);
    expect(link).toBeDisabled();
    expect(link).not.toHaveAttribute('href');

    // `EuiToolTip` reveals its content on hover or focus; the wrapper span is what makes
    // that reachable, because a disabled button cannot receive focus itself.
    fireEvent.mouseOver(link);

    expect(await screen.findByText(REQUIRED_TOOLTIP)).toBeInTheDocument();
  });

  it('disables the link when the space grants no advancedSettings capability at all', async () => {
    renderLink({ showManagedWorkflows: false, canChangeAdvancedSettings: undefined });

    const link = screen.getByTestId(LINK_TEST_SUBJ);
    expect(link).toBeDisabled();
    expect(link).not.toHaveAttribute('href');

    fireEvent.mouseOver(link);

    expect(await screen.findByText(REQUIRED_TOOLTIP)).toBeInTheDocument();
  });

  it('keeps linking to executions when the setting is on, even without permission to change it', () => {
    renderLink({ showManagedWorkflows: true, canChangeAdvancedSettings: false });

    const link = screen.getByTestId(LINK_TEST_SUBJ);
    expect(link).not.toBeDisabled();
    expect(link).toHaveAttribute('href', EXECUTIONS_HREF);
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('focusably wraps the disabled link so the reason is not pointer-only', () => {
    renderLink({ showManagedWorkflows: false, canChangeAdvancedSettings: false });

    const link = screen.getByTestId(LINK_TEST_SUBJ);
    expect(link).toBeDisabled();

    // A disabled button cannot take focus, so the tooltip's anchor is a wrapper span.
    // Removing that wrapper is what would make the reason hover-only again.
    const anchor = link.closest('[tabindex="0"]');
    expect(anchor).not.toBeNull();
    expect(anchor).toContainElement(link);
  });
});
