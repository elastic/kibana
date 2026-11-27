/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { useUnsavedChangesPrompt } from '@kbn/unsaved-changes-prompt';
import { InvestigationsSettingsTab } from './investigations_settings_tab';

const mockRequestSave = jest.fn();
const mockCancel = jest.fn();
const mockOpenCustomContext = jest.fn();
const mockKibanaServices = {
  application: { navigateToUrl: jest.fn() },
  http: {},
  overlays: { openConfirm: jest.fn() },
  appParams: { history: {} },
};

jest.mock('@kbn/unsaved-changes-prompt', () => ({
  useUnsavedChangesPrompt: jest.fn(),
}));
jest.mock('../../hooks/use_kibana', () => ({
  useKibana: () => ({ services: mockKibanaServices }),
}));
jest.mock('./components/investigation_identity_section', () => ({
  InvestigationIdentitySection: () => <div data-test-subj="investigation-identity-section" />,
}));
jest.mock('./components/investigation_limits_section', () => ({
  InvestigationLimitsSection: () => <div data-test-subj="run-limits-section" />,
}));
jest.mock('./components/use_investigation_limits_form', () => ({
  useInvestigationLimitsForm: () => ({
    isDirty: true,
    isSaving: false,
    canManage: true,
    update: { limits: { automatic_investigation: 10 } },
    requestSave: mockRequestSave,
    confirmAndSave: jest.fn(),
    cancel: mockCancel,
  }),
}));

const mockUseUnsavedChangesPrompt = useUnsavedChangesPrompt as jest.MockedFunction<
  typeof useUnsavedChangesPrompt
>;

describe('InvestigationsSettingsTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequestSave.mockResolvedValue('saved');
  });

  it('wires investigation run limits to the unsaved prompt and shared save bar', async () => {
    render(
      <I18nProvider>
        <InvestigationsSettingsTab />
      </I18nProvider>
    );

    expect(mockUseUnsavedChangesPrompt).toHaveBeenCalledWith(
      expect.objectContaining({ hasUnsavedChanges: true })
    );
    expect(screen.getByTestId('nightshiftInvestigationProcessSection')).toHaveTextContent(
      'Investigation process'
    );
    expect(screen.getByTestId('run-limits-section')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('streams-settings-save-button'));

    await waitFor(() => expect(mockRequestSave).toHaveBeenCalledTimes(1));
  });

  it.each([
    { canEdit: true, label: 'Edit investigation context' },
    { canEdit: false, label: 'View investigation context' },
  ])('shows the $label action when canEdit is $canEdit', ({ canEdit, label }) => {
    render(
      <I18nProvider>
        <InvestigationsSettingsTab
          onCustomContextClick={mockOpenCustomContext}
          canEditCustomContext={canEdit}
        />
      </I18nProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: label }));
    expect(mockOpenCustomContext).toHaveBeenCalledTimes(1);
  });
});
