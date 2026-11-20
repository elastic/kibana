/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { WorkflowMigrationDataInputFlyout } from './data_input_flyout';
import { TestProviders } from '../../../../common/mock/test_providers';

const mockCloseFlyout = jest.fn();
const mockCreateWorkflowMigration = jest.fn();
const mockAddError = jest.fn();
const mockAddSuccess = jest.fn();

jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  useGeneratedHtmlId: jest.fn(() => 'generated-id'),
}));

jest.mock('../../../../common/lib/kibana/kibana_react', () => ({
  useKibana: () => ({
    services: {
      siemMigrations: {
        workflows: { createWorkflowMigration: mockCreateWorkflowMigration },
      },
      notifications: { toasts: { addError: mockAddError, addSuccess: mockAddSuccess } },
    },
  }),
}));

jest.mock('../../../../common/components/user_profiles/use_get_current_user_profile', () => ({
  useGetCurrentUserProfile: () => ({
    data: { user: { full_name: 'Test User', username: 'testuser' } },
    isLoading: false,
  }),
}));

jest.mock('../../../common/components/migration_data_input_flyout_context', () => ({
  ...jest.requireActual('../../../common/components/migration_data_input_flyout_context'),
  useMigrationDataInputContext: () => ({ closeFlyout: mockCloseFlyout }),
}));

const story = {
  name: 'Story A',
  agents: [{ type: 'Agents::HTTPRequestAgent', name: 'Request', guid: 'guid-a' }],
};

const renderFlyout = (onClose = jest.fn()) =>
  render(
    <TestProviders>
      <WorkflowMigrationDataInputFlyout onClose={onClose} />
    </TestProviders>
  );

const uploadStory = async () => {
  // the migration name is registered when the name field loses focus
  fireEvent.blur(screen.getByTestId('migrationNameInput'));
  fireEvent.change(screen.getByTestId('tinesStoriesFilePicker'), {
    target: { files: [new File([JSON.stringify(story)], 'story.json')] },
  });
  await waitFor(() => expect(screen.getByTestId('uploadTinesStoriesButton')).toBeEnabled());
  fireEvent.click(screen.getByTestId('uploadTinesStoriesButton'));
};

describe('WorkflowMigrationDataInputFlyout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateWorkflowMigration.mockResolvedValue('migration-1');
  });

  it('should show the flyout title', () => {
    renderFlyout();

    expect(screen.getByText('Upload Tines stories')).toBeInTheDocument();
  });

  it('should show the migration name and the upload steps', () => {
    renderFlyout();

    expect(screen.getByTestId('migrationNameInput')).toBeInTheDocument();
    expect(screen.getByTestId('tinesStoriesFilePicker')).toBeInTheDocument();
  });

  it('should show the upload step as the current step with its sub-steps', () => {
    renderFlyout();

    expect(screen.getByTestId('workflowsUploadStepNumber')).toHaveTextContent(/Current step is 1/);
    expect(screen.getByTestId('migrationsSubSteps')).toBeInTheDocument();
  });

  it('should complete the migration name sub-step when the name is saved', () => {
    renderFlyout();
    const subSteps = within(screen.getByTestId('migrationsSubSteps'));
    expect(subSteps.queryByText(/Step 1 is complete/)).not.toBeInTheDocument();

    fireEvent.blur(screen.getByTestId('migrationNameInput'));

    expect(subSteps.getByText(/Step 1 is complete/)).toBeInTheDocument();
  });

  it('should complete and collapse the upload step once the migration is created', async () => {
    renderFlyout();

    await uploadStory();

    await waitFor(() =>
      expect(screen.getByTestId('workflowsUploadStepNumber')).toHaveTextContent(
        /Step 1 is complete/
      )
    );
    expect(screen.queryByTestId('migrationsSubSteps')).not.toBeInTheDocument();
    expect(screen.queryByTestId('tinesStoriesFilePicker')).not.toBeInTheDocument();
  });

  it('should keep the upload step open when the migration cannot be created', async () => {
    mockCreateWorkflowMigration.mockRejectedValue(new Error('boom'));
    renderFlyout();

    await uploadStory();

    await waitFor(() => expect(mockAddError).toHaveBeenCalled());
    expect(screen.getByTestId('workflowsUploadStepNumber')).toHaveTextContent(/Current step is 1/);
    expect(screen.getByTestId('migrationsSubSteps')).toBeInTheDocument();
  });

  it('should prefill the migration name with the current user name', () => {
    renderFlyout();

    expect((screen.getByTestId('migrationNameInput') as HTMLInputElement).value).toContain(
      "Test User's migration"
    );
  });

  it('should keep the translate button disabled until the migration is created', () => {
    renderFlyout();

    expect(screen.getByTestId('workflowDataFlyoutTranslateButton')).toBeDisabled();
  });

  it('should create the migration with the uploaded stories and the migration name', async () => {
    renderFlyout();

    await uploadStory();

    await waitFor(() =>
      expect(mockCreateWorkflowMigration).toHaveBeenCalledWith(
        [expect.objectContaining({ name: 'Story A' })],
        expect.stringContaining("Test User's migration")
      )
    );
  });

  it('should enable the translate button once the migration is created', async () => {
    renderFlyout();

    await uploadStory();

    await waitFor(() =>
      expect(screen.getByTestId('workflowDataFlyoutTranslateButton')).toBeEnabled()
    );
  });

  it('should show an error toast when the migration cannot be created', async () => {
    mockCreateWorkflowMigration.mockRejectedValue(new Error('boom'));
    renderFlyout();

    await uploadStory();

    await waitFor(() => expect(mockAddError).toHaveBeenCalled());
    expect(screen.getByTestId('workflowDataFlyoutTranslateButton')).toBeDisabled();
  });

  it('should call onClose when the close button is clicked', () => {
    const onClose = jest.fn();
    renderFlyout(onClose);

    fireEvent.click(screen.getByTestId('workflowDataFlyoutCloseButton'));

    expect(onClose).toHaveBeenCalled();
  });
});
