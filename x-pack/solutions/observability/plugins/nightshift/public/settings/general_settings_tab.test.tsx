/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { coreMock } from '@kbn/core/public/mocks';
import { NIGHTSHIFT_UI_PRIVILEGES } from '@kbn/nightshift-shared';
import type { useKibana } from '../hooks/use_kibana';
import { GeneralSettingsTab } from './general_settings_tab';
import { useDeveloperMode } from '../hooks/use_developer_mode';

const baseCapabilities = coreMock.createStart().application.capabilities;
let mockApplication: Pick<ReturnType<typeof useKibana>['services']['application'], 'capabilities'> =
  {
    capabilities: baseCapabilities,
  };

jest.mock('../hooks/use_kibana', () => ({
  useKibana: () => ({ services: { application: mockApplication } }),
}));
jest.mock('../hooks/use_developer_mode');
jest.mock('./components/connectors_section', () => ({
  ConnectorsSection: () => <div data-test-subj="connectorsSectionStub" />,
}));
jest.mock('./components/apps_section', () => ({
  AppsSection: ({ canEdit }: { canEdit: boolean }) => (
    <div data-test-subj="apps-section" data-can-edit={canEdit ? 'true' : 'false'} />
  ),
}));
jest.mock('./components/knowledge_purge_section', () => ({
  KnowledgePurgeSection: ({ canManage }: { canManage: boolean }) => (
    <div data-test-subj="knowledge-purge-section" data-can-manage={canManage ? 'true' : 'false'} />
  ),
}));

const mockUseDeveloperMode = useDeveloperMode as jest.MockedFunction<typeof useDeveloperMode>;
const setDeveloperMode = jest.fn();

const renderTab = (capabilities: {
  nightshift?: Record<string, boolean>;
  advancedSettings?: { save: boolean };
  streams?: { manage: boolean };
}) => {
  mockApplication = { capabilities: { ...baseCapabilities, ...capabilities } };

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

  it.each<{
    name: string;
    nightshift?: Record<string, boolean>;
    streams?: { manage: boolean };
  }>([
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

  it('disables developer mode while a save is in progress', () => {
    mockUseDeveloperMode.mockReturnValue({
      isDeveloperMode: false,
      isSaving: true,
      setDeveloperMode,
    });
    renderTab({
      advancedSettings: { save: true },
      nightshift: {
        [NIGHTSHIFT_UI_PRIVILEGES.manage]: true,
        [NIGHTSHIFT_UI_PRIVILEGES.configure]: true,
      },
    });

    expect(screen.getByTestId('nightshiftDeveloperModeSwitch')).toBeDisabled();
  });

  it('hides the knowledge purge until developer mode is on', () => {
    renderTab({
      nightshift: {
        [NIGHTSHIFT_UI_PRIVILEGES.manage]: true,
        [NIGHTSHIFT_UI_PRIVILEGES.configure]: true,
      },
    });

    expect(screen.queryByTestId('knowledge-purge-section')).not.toBeInTheDocument();
  });

  it('shows the knowledge purge in developer mode, gated on manage and configure', () => {
    mockUseDeveloperMode.mockReturnValue({
      isDeveloperMode: true,
      isSaving: false,
      setDeveloperMode,
    });
    renderTab({
      nightshift: {
        [NIGHTSHIFT_UI_PRIVILEGES.manage]: true,
        [NIGHTSHIFT_UI_PRIVILEGES.configure]: true,
      },
    });

    expect(screen.getByTestId('nightshiftKnowledgeSettingsSection')).toHaveTextContent('Knowledge');
    expect(screen.getByTestId('knowledge-purge-section')).toHaveAttribute(
      'data-can-manage',
      'true'
    );
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
