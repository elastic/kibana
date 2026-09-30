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
import { RunExampleLink } from '.';

jest.mock('../../../../use_workflow_editor_link');

const mockUseWorkflowEditorLink = useWorkflowEditorLink as jest.Mock;

const MOCK_RUN_EXAMPLE_URL = 'http://localhost:5601/s/default/app/workflows/workflow-run-example';

const renderComponent = () =>
  render(
    <TestProviders>
      <RunExampleLink />
    </TestProviders>
  );

describe('RunExampleLink', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseWorkflowEditorLink.mockReturnValue({
      editorUrl: MOCK_RUN_EXAMPLE_URL,
      navigateToEditor: jest.fn(),
      resolvedWorkflowId: 'workflow-run-example',
    });
  });

  it('requests the run example workflow link', () => {
    renderComponent();

    expect(mockUseWorkflowEditorLink).toHaveBeenCalledWith({
      workflowId: 'attack-discovery-run-example',
      workflowRunId: null,
    });
  });

  it('renders the View example link with the resolved href', () => {
    renderComponent();

    expect(screen.getByTestId('viewRunExampleWorkflow')).toHaveAttribute(
      'href',
      MOCK_RUN_EXAMPLE_URL
    );
  });

  it('opens the View example link in a new tab', () => {
    renderComponent();

    expect(screen.getByTestId('viewRunExampleWorkflow')).toHaveAttribute('target', '_blank');
  });

  it('renders nothing when the run example workflow is not available', () => {
    mockUseWorkflowEditorLink.mockReturnValue({
      editorUrl: null,
      navigateToEditor: jest.fn(),
      resolvedWorkflowId: null,
    });

    renderComponent();

    expect(screen.queryByTestId('runExampleDescription')).not.toBeInTheDocument();
  });
});
