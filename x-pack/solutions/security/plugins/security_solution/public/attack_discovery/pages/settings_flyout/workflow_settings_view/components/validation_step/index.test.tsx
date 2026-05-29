/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import { TestProviders } from '../../../../../../common/mock';
import { useWorkflowEditorLink } from '../../../../use_workflow_editor_link';
import { ValidationStep } from '.';

jest.mock('../../../../use_workflow_editor_link');

const mockUseWorkflowEditorLink = useWorkflowEditorLink as jest.Mock;

const defaultEditorUrl = 'http://localhost:5601/s/default/app/workflows/workflow-123';

const renderComponent = (
  validationPanel: React.ReactNode = <div data-test-subj="validationPanel" />
) =>
  render(
    <TestProviders>
      <ValidationStep validationPanel={validationPanel} />
    </TestProviders>
  );

describe('ValidationStep', () => {
  beforeEach(() => {
    mockUseWorkflowEditorLink.mockReturnValue({
      editorUrl: defaultEditorUrl,
      navigateToEditor: jest.fn(),
      resolvedWorkflowId: 'workflow-123',
    });
  });

  it('renders the validation section description', () => {
    renderComponent();

    const description = screen.getByTestId('validationStepDescription');

    expect(description).toHaveTextContent(
      /Choose how discoveries are validated.*or enriched before they are saved as attacks\./
    );
  });

  it('renders "validated" as a link in the description', () => {
    renderComponent();

    const link = screen.getByTestId('validationCustomExampleLink');

    expect(link).toBeInTheDocument();
    expect(link).toHaveTextContent('validated');
  });

  it('opens the validated link in a new tab', () => {
    renderComponent();

    const link = screen.getByTestId('validationCustomExampleLink');

    expect(link).toHaveAttribute('target', '_blank');
  });

  it('uses a space-aware URL for the validated link', () => {
    const spaceAwareUrl = 'http://localhost:5601/s/my-space/app/workflows/workflow-123';

    mockUseWorkflowEditorLink.mockReturnValue({
      editorUrl: spaceAwareUrl,
      navigateToEditor: jest.fn(),
      resolvedWorkflowId: 'workflow-123',
    });

    renderComponent();

    const link = screen.getByTestId('validationCustomExampleLink');

    expect(link).toHaveAttribute('href', spaceAwareUrl);
  });

  it('renders "validated" as plain text when the example workflow is not available', () => {
    mockUseWorkflowEditorLink.mockReturnValue({
      editorUrl: null,
      navigateToEditor: jest.fn(),
      resolvedWorkflowId: null,
    });

    renderComponent();

    expect(screen.queryByTestId('validationCustomExampleLink')).not.toBeInTheDocument();

    const description = screen.getByTestId('validationStepDescription');

    expect(description).toHaveTextContent('validated');
  });

  it('requests the custom validation example workflow link', () => {
    renderComponent();

    expect(mockUseWorkflowEditorLink).toHaveBeenCalledWith({
      workflowId: 'attack-discovery-custom-validation-example',
      workflowRunId: null,
    });
  });

  it('renders the validation panel', () => {
    renderComponent();

    expect(screen.getByTestId('validationPanel')).toBeInTheDocument();
  });
});
