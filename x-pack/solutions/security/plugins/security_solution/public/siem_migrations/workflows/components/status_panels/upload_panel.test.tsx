/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { UploadWorkflowsPanel, UploadWorkflowsSectionPanel } from './upload_panel';
import { MigrationDataInputContextProvider } from '../../../common/components';
import { TestProviders } from '../../../../common/mock';

const renderPanel = (
  props: Partial<React.ComponentProps<typeof UploadWorkflowsPanel>> = {},
  openFlyout = jest.fn()
) =>
  render(
    <TestProviders>
      <MigrationDataInputContextProvider
        openFlyout={openFlyout}
        closeFlyout={jest.fn()}
        isFlyoutOpen={false}
      >
        <UploadWorkflowsPanel {...props} />
      </MigrationDataInputContextProvider>
    </TestProviders>
  );

describe('UploadWorkflowsPanel', () => {
  it('should open the upload flyout when the upload button is clicked', () => {
    const openFlyout = jest.fn();
    renderPanel({}, openFlyout);

    fireEvent.click(screen.getByTestId('startWorkflowMigrationUploadButton'));

    expect(openFlyout).toHaveBeenCalled();
  });

  it('should offer to upload more stories when there are migrations already', () => {
    renderPanel({ isUploadMore: true });

    expect(screen.getByTestId('startWorkflowMigrationUploadMoreButton')).toBeInTheDocument();
    expect(screen.queryByTestId('startWorkflowMigrationUploadButton')).not.toBeInTheDocument();
  });

  it('should label the upload button after the workflows', () => {
    renderPanel();

    expect(screen.getByTestId('startWorkflowMigrationUploadButton')).toHaveTextContent(
      'Upload workflows'
    );
  });

  it('should disable the upload button when disabled', () => {
    renderPanel({ isDisabled: true });

    expect(screen.getByTestId('startWorkflowMigrationUploadButton')).toBeDisabled();
  });

  it('should ask to export workflows when there are no migrations yet', () => {
    renderPanel();

    expect(screen.getByText('Export your workflows to start translation.')).toBeInTheDocument();
  });

  it('should explain, without naming a vendor, how to upload the exported workflows', () => {
    renderPanel();

    expect(
      screen.getByText(
        'Export your workflows from source system and upload it here to generate Elastic Workflows artifacts. Click “Upload workflows” to get started.'
      )
    ).toBeInTheDocument();
  });

  it('should ask whether to migrate more workflows when there are migrations already', () => {
    renderPanel({ isUploadMore: true });

    expect(screen.getByText('Need to migrate more workflows?')).toBeInTheDocument();
  });
});

describe('UploadWorkflowsSectionPanel', () => {
  it('should disable the upload button without opening a flyout when disabled', () => {
    const onOpenFlyout = jest.fn();
    render(<UploadWorkflowsSectionPanel isDisabled onOpenFlyout={onOpenFlyout} />, {
      wrapper: TestProviders,
    });

    fireEvent.click(screen.getByTestId('startWorkflowMigrationUploadButton'));

    expect(onOpenFlyout).not.toHaveBeenCalled();
  });
});
