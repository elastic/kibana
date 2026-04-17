/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RunWorkflowPanel, type RunWorkflowPanelProps } from './run_workflow_panel';
import * as i18n from '../translations';

const mockMutate = jest.fn();
jest.mock('@kbn/workflows-ui', () => ({
  useRunWorkflow: () => ({ mutate: mockMutate }),
  WorkflowSelector: ({ onWorkflowChange }: { onWorkflowChange: (id: string) => void }) => (
    <div data-test-subj="workflow-selector-mock">
      <button
        data-test-subj="select-workflow-option"
        type="button"
        onClick={() => onWorkflowChange('test-workflow-id')}
      >
        {'Select workflow'}
      </button>
    </div>
  ),
}));

const mockNavigateToApp = jest.fn();
jest.mock('@kbn/kibana-react-plugin/public', () => {
  const actual = jest.requireActual('@kbn/kibana-react-plugin/public');
  return {
    ...actual,
    useKibana: () => ({
      services: {
        application: { navigateToApp: mockNavigateToApp },
        rendering: {},
      },
    }),
  };
});

const mockAddSuccess = jest.fn();
const mockAddError = jest.fn();
jest.mock('../../../../common/hooks/use_app_toasts', () => ({
  useAppToasts: () => ({
    addSuccess: mockAddSuccess,
    addError: mockAddError,
  }),
}));

const defaultProps: RunWorkflowPanelProps = {
  inputs: { alert_ids: ['alert-1'] },
  sortTriggerType: 'security_alert',
  executeButtonTestSubj: 'test-execute-btn',
  onClose: jest.fn(),
};

const renderComponent = (props: Partial<RunWorkflowPanelProps> = {}) =>
  render(<RunWorkflowPanel {...defaultProps} {...props} />);

describe('RunWorkflowPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the workflow selector', () => {
    renderComponent();

    expect(screen.getByTestId('workflow-selector-mock')).toBeInTheDocument();
  });

  it('should render the execute button', () => {
    renderComponent();

    expect(screen.getByTestId('test-execute-btn')).toBeInTheDocument();
    expect(screen.getByTestId('test-execute-btn')).toHaveTextContent(i18n.RUN_WORKFLOW_BUTTON);
  });

  it('should disable the execute button when no workflow is selected', () => {
    renderComponent();

    expect(screen.getByTestId('test-execute-btn')).toBeDisabled();
  });

  it('should enable the execute button after selecting a workflow', () => {
    renderComponent();

    fireEvent.click(screen.getByTestId('select-workflow-option'));

    expect(screen.getByTestId('test-execute-btn')).not.toBeDisabled();
  });

  it('should call runWorkflow.mutate with the selected workflow id and inputs on execute', () => {
    renderComponent();

    fireEvent.click(screen.getByTestId('select-workflow-option'));
    fireEvent.click(screen.getByTestId('test-execute-btn'));

    expect(mockMutate).toHaveBeenCalledWith(
      { id: 'test-workflow-id', inputs: { alert_ids: ['alert-1'] } },
      expect.objectContaining({
        onSuccess: expect.any(Function),
        onError: expect.any(Function),
        onSettled: expect.any(Function),
      })
    );
  });

  it('should not call mutate when clicking execute without a selection', () => {
    renderComponent();

    fireEvent.click(screen.getByTestId('test-execute-btn'));

    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('should call onClose on settled', () => {
    const onClose = jest.fn();
    renderComponent({ onClose });

    fireEvent.click(screen.getByTestId('select-workflow-option'));
    fireEvent.click(screen.getByTestId('test-execute-btn'));

    const { onSettled } = mockMutate.mock.calls[0][1];
    onSettled();

    expect(onClose).toHaveBeenCalled();
  });

  it('should call onExecute when provided', () => {
    const onExecute = jest.fn();
    renderComponent({ onExecute });

    fireEvent.click(screen.getByTestId('select-workflow-option'));
    fireEvent.click(screen.getByTestId('test-execute-btn'));

    expect(onExecute).toHaveBeenCalledTimes(1);
  });

  it('should show a loading spinner while executing', () => {
    renderComponent();

    fireEvent.click(screen.getByTestId('select-workflow-option'));
    fireEvent.click(screen.getByTestId('test-execute-btn'));

    expect(screen.getByTestId('test-execute-btn')).toBeDisabled();
  });

  it('should re-enable the button after settled', async () => {
    renderComponent();

    fireEvent.click(screen.getByTestId('select-workflow-option'));
    fireEvent.click(screen.getByTestId('test-execute-btn'));

    const { onSettled } = mockMutate.mock.calls[0][1];
    onSettled();

    await waitFor(() => {
      expect(screen.getByTestId('test-execute-btn')).not.toBeDisabled();
    });
  });

  it('should show a success toast on successful execution', () => {
    renderComponent();

    fireEvent.click(screen.getByTestId('select-workflow-option'));
    fireEvent.click(screen.getByTestId('test-execute-btn'));

    const { onSuccess } = mockMutate.mock.calls[0][1];
    onSuccess({ workflowExecutionId: 'exec-123' });

    expect(mockAddSuccess).toHaveBeenCalledWith(
      expect.objectContaining({ title: i18n.WORKFLOW_START_SUCCESS_TOAST })
    );
  });

  it('should show an error toast on failed execution', () => {
    renderComponent();

    fireEvent.click(screen.getByTestId('select-workflow-option'));
    fireEvent.click(screen.getByTestId('test-execute-btn'));

    const error = new Error('something went wrong');
    const { onError } = mockMutate.mock.calls[0][1];
    onError(error);

    expect(mockAddError).toHaveBeenCalledWith(error, {
      title: i18n.WORKFLOW_START_FAILED_TOAST,
    });
  });
});
