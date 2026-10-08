/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { NIGHTSHIFT_UI_PRIVILEGES } from '@kbn/nightshift-shared';
import { useKibana } from '../hooks/use_kibana';
import { GeneralSettingsTab } from './general_settings_tab';
import { useDeveloperMode } from './hooks/use_developer_mode';

jest.mock('../hooks/use_kibana');
jest.mock('./hooks/use_developer_mode');
jest.mock('./components/apps_section', () => ({
  AppsSection: ({ canEdit }: { canEdit: boolean }) => (
    <div data-test-subj="apps-section" data-can-edit={canEdit ? 'true' : 'false'} />
  ),
}));

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;
const mockUseDeveloperMode = useDeveloperMode as jest.MockedFunction<typeof useDeveloperMode>;
const setDeveloperMode = jest.fn();

const renderTab = (capabilities: {
  nightshift?: Record<string, unknown>;
  advancedSettings?: { save: boolean };
  streams?: { manage: boolean };
}) => {
  mockUseKibana.mockReturnValue({
    services: { application: { capabilities } },
  } as never);

  return render(<GeneralSettingsTab />);
};

describe('GeneralSettingsTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDeveloperMode.mockReturnValue({
      isDeveloperMode: false,
      isSaving: false,
      setDeveloperMode,
    });
  });

  it('enables Slack editing when Nightshift manage and configure are both granted', () => {
    renderTab({
      nightshift: {
        [NIGHTSHIFT_UI_PRIVILEGES.manage]: true,
        [NIGHTSHIFT_UI_PRIVILEGES.configure]: true,
      },
    });

    expect(screen.getByTestId('apps-section')).toHaveAttribute('data-can-edit', 'true');
  });

  it.each([
    {
      name: 'manage only',
      nightshift: { [NIGHTSHIFT_UI_PRIVILEGES.manage]: true },
    },
    {
      name: 'configure only',
      nightshift: { [NIGHTSHIFT_UI_PRIVILEGES.configure]: true },
    },
    {
      name: 'Streams manage only',
      nightshift: undefined,
      streams: { manage: true },
    },
  ])('keeps Slack editing disabled with $name', ({ nightshift, streams }) => {
    renderTab({ nightshift, streams });

    expect(screen.getByTestId('apps-section')).toHaveAttribute('data-can-edit', 'false');
  });

  it('shows and persists Nightshift developer mode from General settings', () => {
    renderTab({
      advancedSettings: { save: true },
      nightshift: {
        [NIGHTSHIFT_UI_PRIVILEGES.manage]: true,
        [NIGHTSHIFT_UI_PRIVILEGES.configure]: true,
      },
    });

    expect(screen.getByTestId('nightshiftDeveloperModeSection')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('nightshiftDeveloperModeSwitch'));
    expect(setDeveloperMode).toHaveBeenCalledWith(true);
  });

  it('disables developer mode without permission to save advanced settings', () => {
    renderTab({
      advancedSettings: { save: false },
      nightshift: {
        [NIGHTSHIFT_UI_PRIVILEGES.manage]: true,
        [NIGHTSHIFT_UI_PRIVILEGES.configure]: true,
      },
    });

    expect(screen.getByTestId('nightshiftDeveloperModeSwitch')).toBeDisabled();
  });
});
