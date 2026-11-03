/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { Settings } from '.';

const mockUseEditableSettings = jest.fn();

jest.mock('@kbn/observability-shared-plugin/public', () => ({
  useEditableSettings: (...args: unknown[]) => mockUseEditableSettings(...args),
  useUiTracker: () => jest.fn(),
}));

jest.mock('../../components/contexts/profiling_dependencies/use_profiling_dependencies', () => ({
  useProfilingDependencies: () => ({
    start: {
      core: {
        docLinks: { links: { management: {} } },
        notifications: { toasts: { addDanger: jest.fn() } },
        settings: { client: { validateValue: jest.fn() } },
      },
    },
  }),
}));

jest.mock('../../components/profiling_app_page_template', () => ({
  ProfilingAppPageTemplate: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

const editableSettings = {
  fields: {},
  isLoading: false,
  loadError: undefined,
  unsavedChanges: {},
  handleFieldChange: jest.fn(),
  saveAll: jest.fn(),
  isSaving: false,
  cleanUnsavedChanges: jest.fn(),
};

const renderSettings = () =>
  render(
    <I18nProvider>
      <Settings />
    </I18nProvider>
  );

describe('Settings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows a spinner in each section while the setting definitions load', () => {
    mockUseEditableSettings.mockReturnValue({ ...editableSettings, isLoading: true });

    renderSettings();

    expect(screen.getAllByTestId('profilingSettingsLoading')).toHaveLength(3);
    expect(screen.queryByTestId('profilingSettingsLoadError')).not.toBeInTheDocument();
  });

  it('shows a single error callout that replaces spinners when the setting definitions fail to load', () => {
    mockUseEditableSettings.mockReturnValue({
      ...editableSettings,
      loadError: new Error('Internal Server Error'),
    });

    renderSettings();

    const loadError = screen.getByTestId('profilingSettingsLoadError');
    expect(loadError).toHaveTextContent('Unable to load settings');
    expect(loadError).toHaveTextContent('Internal Server Error');
    expect(screen.queryByTestId('profilingSettingsLoading')).not.toBeInTheDocument();
  });

  it('shows neither the spinners nor the error callout once the settings have loaded', () => {
    mockUseEditableSettings.mockReturnValue(editableSettings);

    renderSettings();

    expect(screen.queryByTestId('profilingSettingsLoading')).not.toBeInTheDocument();
    expect(screen.queryByTestId('profilingSettingsLoadError')).not.toBeInTheDocument();
  });
});
