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

  it('should disable the upload button when disabled', () => {
    renderPanel({ isDisabled: true });

    expect(screen.getByTestId('startWorkflowMigrationUploadButton')).toBeDisabled();
  });

  it('should explain how to export a Tines story when there are no migrations yet', () => {
    renderPanel();

    expect(screen.getByText('Export a Tines story to start translation.')).toBeInTheDocument();
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
