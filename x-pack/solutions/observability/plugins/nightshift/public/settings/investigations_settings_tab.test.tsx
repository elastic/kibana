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
import { useKibana } from '../hooks/use_kibana';
import { InvestigationsSettingsTab } from './investigations_settings_tab';

const mockRequestSave = jest.fn();
const mockCancel = jest.fn();
const mockOpenCustomContext = jest.fn();

jest.mock('@kbn/unsaved-changes-prompt', () => ({
  useUnsavedChangesPrompt: jest.fn(),
}));
jest.mock('../hooks/use_kibana');
jest.mock('./components/run_limits_section', () => ({
  RunLimitsSection: ({ description }: { description: React.ReactNode }) => (
    <div data-test-subj="run-limits-section">{description}</div>
  ),
}));
jest.mock('./components/use_run_limits_form', () => ({
  useRunLimitsForm: () => ({
    isDirty: true,
    isSaving: false,
    canManage: true,
    update: { limits: { investigation: 10 } },
    requestSave: mockRequestSave,
    confirmAndSave: jest.fn(),
    cancel: mockCancel,
  }),
}));

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;
const mockUseUnsavedChangesPrompt = useUnsavedChangesPrompt as jest.MockedFunction<
  typeof useUnsavedChangesPrompt
>;

describe('InvestigationsSettingsTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequestSave.mockResolvedValue('saved');
    mockUseKibana.mockReturnValue({
      services: {
        application: { navigateToUrl: jest.fn() },
        http: {},
        overlays: { openConfirm: jest.fn() },
        appParams: { history: {} },
      },
    } as never);
  });

  it('shows the shared save bar and saves run-limit changes', async () => {
    render(
      <I18nProvider>
        <InvestigationsSettingsTab onCustomContextClick={mockOpenCustomContext} />
      </I18nProvider>
    );

    expect(mockUseUnsavedChangesPrompt).toHaveBeenCalledWith(
      expect.objectContaining({ hasUnsavedChanges: true })
    );
    expect(screen.getByTestId('nightshiftInvestigationProcessSection')).toHaveTextContent(
      'Investigation process'
    );
    expect(screen.getByTestId('run-limits-section')).toHaveTextContent(
      'These limits apply only to scheduled investigation'
    );
    expect(screen.getByTestId('nightshiftCustomContextSection')).toHaveTextContent(
      'Notes that Nightshift adds to its system prompt'
    );
    fireEvent.click(screen.getByTestId('nightshiftOpenCustomContext'));
    expect(mockOpenCustomContext).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByTestId('streams-settings-save-button'));

    await waitFor(() => expect(mockRequestSave).toHaveBeenCalledTimes(1));
  });
});
