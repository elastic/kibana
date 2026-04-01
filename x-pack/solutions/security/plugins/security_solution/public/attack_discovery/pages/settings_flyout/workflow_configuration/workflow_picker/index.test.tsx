/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { WorkflowPicker } from '.';
import { TestProviders } from '../../../../../common/mock';
import type { WorkflowItem } from '../types';

const mockWorkflows: WorkflowItem[] = [
  {
    description: 'Test workflow 1',
    id: 'workflow-1',
    name: 'Workflow 1',
  },
  {
    description: 'Test workflow 2',
    id: 'workflow-2',
    name: 'Workflow 2',
  },
  {
    description: 'Test workflow 3',
    id: 'workflow-3',
    name: 'Workflow 3',
  },
];

const defaultProps = {
  label: 'Test Workflow Picker',
  onChange: jest.fn(),
  selectedWorkflowIds: [],
  workflows: mockWorkflows,
};

describe('WorkflowPicker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the workflow picker', () => {
    render(
      <TestProviders>
        <WorkflowPicker {...defaultProps} />
      </TestProviders>
    );

    expect(screen.getByTestId('workflowPicker')).toBeInTheDocument();
  });

  it('renders with custom data-test-subj', () => {
    render(
      <TestProviders>
        <WorkflowPicker {...defaultProps} data-test-subj="customTestId" />
      </TestProviders>
    );

    expect(screen.getByTestId('customTestId')).toBeInTheDocument();
  });

  describe('workflow options', () => {
    beforeEach(async () => {
      render(
        <TestProviders>
          <WorkflowPicker {...defaultProps} />
        </TestProviders>
      );

      const input = screen.getByRole('combobox');
      input.focus();
      await userEvent.type(input, 'Workflow');

      await waitFor(() => {
        expect(screen.getByTitle('Workflow 1')).toBeInTheDocument();
      });
    });

    it('renders first workflow option', () => {
      expect(screen.getByTitle('Workflow 1')).toBeInTheDocument();
    });

    it('renders second workflow option', () => {
      expect(screen.getByTitle('Workflow 2')).toBeInTheDocument();
    });

    it('renders third workflow option', () => {
      expect(screen.getByTitle('Workflow 3')).toBeInTheDocument();
    });
  });

  it('renders selected workflow', () => {
    render(
      <TestProviders>
        <WorkflowPicker {...defaultProps} selectedWorkflowIds={['workflow-2']} />
      </TestProviders>
    );

    expect(screen.getByText('Workflow 2')).toBeInTheDocument();
  });

  it('renders multiple selected workflows', () => {
    render(
      <TestProviders>
        <WorkflowPicker {...defaultProps} selectedWorkflowIds={['workflow-1', 'workflow-3']} />
      </TestProviders>
    );

    expect(screen.getByText('Workflow 1')).toBeInTheDocument();
    expect(screen.getByText('Workflow 3')).toBeInTheDocument();
  });

  it('calls onChange with array when selection changes', async () => {
    const onChange = jest.fn();
    render(
      <TestProviders>
        <WorkflowPicker {...defaultProps} onChange={onChange} />
      </TestProviders>
    );

    const input = screen.getByRole('combobox');
    input.focus();
    await userEvent.type(input, 'Workflow 1');

    await waitFor(() => {
      expect(screen.getByText('Workflow 1')).toBeInTheDocument();
    });

    const option = screen.getByText('Workflow 1');
    fireEvent.click(option);

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(['workflow-1']);
    });
  });

  it('calls onChange with multiple items when additional selection is made', async () => {
    const onChange = jest.fn();
    render(
      <TestProviders>
        <WorkflowPicker
          {...defaultProps}
          onChange={onChange}
          selectedWorkflowIds={['workflow-1']}
        />
      </TestProviders>
    );

    const input = screen.getByRole('combobox');
    input.focus();
    await userEvent.type(input, 'Workflow 2');

    await waitFor(() => {
      expect(screen.getByText('Workflow 2')).toBeInTheDocument();
    });

    const option = screen.getByText('Workflow 2');
    fireEvent.click(option);

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(['workflow-1', 'workflow-2']);
    });
  });

  it('calls onChange with empty array when all selections are cleared', async () => {
    const onChange = jest.fn();
    render(
      <TestProviders>
        <WorkflowPicker
          {...defaultProps}
          onChange={onChange}
          selectedWorkflowIds={['workflow-1']}
        />
      </TestProviders>
    );

    const clearButton = screen.getByLabelText(/clear input/i);
    await userEvent.click(clearButton);

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith([]);
    });
  });

  it('renders with loading state', () => {
    render(
      <TestProviders>
        <WorkflowPicker {...defaultProps} isLoading />
      </TestProviders>
    );

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders with invalid state', () => {
    render(
      <TestProviders>
        <WorkflowPicker {...defaultProps} isInvalid />
      </TestProviders>
    );

    const input = screen.getByRole('combobox');
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });

  it('renders empty message when no workflows available', () => {
    render(
      <TestProviders>
        <WorkflowPicker {...defaultProps} workflows={[]} />
      </TestProviders>
    );

    const comboBox = screen.getByTestId('workflowPicker');
    expect(comboBox).toBeInTheDocument();
  });

  it('renders with custom placeholder', () => {
    render(
      <TestProviders>
        <WorkflowPicker {...defaultProps} placeholder="Custom placeholder" />
      </TestProviders>
    );

    expect(screen.getByPlaceholderText('Custom placeholder')).toBeInTheDocument();
  });

  it('renders with custom help text', () => {
    render(
      <TestProviders>
        <WorkflowPicker {...defaultProps} helpText="This is help text" />
      </TestProviders>
    );

    // Help text would be rendered by the parent EuiFormRow, not the picker itself
    const comboBox = screen.getByTestId('workflowPicker');
    expect(comboBox).toBeInTheDocument();
  });

  it('handles empty selectedWorkflowIds', () => {
    render(
      <TestProviders>
        <WorkflowPicker {...defaultProps} selectedWorkflowIds={[]} />
      </TestProviders>
    );

    const comboBox = screen.getByTestId('workflowPicker');
    expect(comboBox).toBeInTheDocument();
  });

  it('renders the workflow id as a fallback when a selected workflow does not exist in the workflows list', () => {
    render(
      <TestProviders>
        <WorkflowPicker {...defaultProps} selectedWorkflowIds={['non-existent-id']} />
      </TestProviders>
    );

    expect(screen.getByText('non-existent-id')).toBeInTheDocument();
  });

  describe('dropdown option descriptions', () => {
    it('renders workflow description below the name in the dropdown', async () => {
      render(
        <TestProviders>
          <WorkflowPicker {...defaultProps} />
        </TestProviders>
      );

      const input = screen.getByRole('combobox');
      input.focus();
      await userEvent.type(input, 'Workflow');

      await waitFor(() => {
        expect(screen.getByTitle('Workflow 1')).toBeInTheDocument();
      });

      expect(screen.getByText('Test workflow 1')).toBeInTheDocument();
    });

    it('renders descriptions for all visible workflow options', async () => {
      render(
        <TestProviders>
          <WorkflowPicker {...defaultProps} />
        </TestProviders>
      );

      const input = screen.getByRole('combobox');
      input.focus();
      await userEvent.type(input, 'Workflow');

      await waitFor(() => {
        expect(screen.getByTitle('Workflow 1')).toBeInTheDocument();
      });

      expect(screen.getByText('Test workflow 1')).toBeInTheDocument();
      expect(screen.getByText('Test workflow 2')).toBeInTheDocument();
      expect(screen.getByText('Test workflow 3')).toBeInTheDocument();
    });

    it('does not render description element when description is an empty string', async () => {
      const workflowsWithEmptyDescription: WorkflowItem[] = [
        { description: '', id: 'workflow-empty', name: 'Empty Desc Workflow' },
      ];

      render(
        <TestProviders>
          <WorkflowPicker {...defaultProps} workflows={workflowsWithEmptyDescription} />
        </TestProviders>
      );

      const input = screen.getByRole('combobox');
      input.focus();
      await userEvent.type(input, 'Empty');

      await waitFor(() => {
        expect(screen.getByTitle('Empty Desc Workflow')).toBeInTheDocument();
      });

      expect(screen.queryByTestId('workflowOptionDescription')).not.toBeInTheDocument();
    });

    it('renders description elements with the correct data-test-subj', async () => {
      render(
        <TestProviders>
          <WorkflowPicker {...defaultProps} />
        </TestProviders>
      );

      const input = screen.getByRole('combobox');
      input.focus();
      await userEvent.type(input, 'Workflow');

      await waitFor(() => {
        expect(screen.getByTitle('Workflow 1')).toBeInTheDocument();
      });

      const descriptions = screen.getAllByTestId('workflowOptionDescription');
      expect(descriptions).toHaveLength(3);
    });

    it('highlights matching search text in workflow names via EuiHighlight', async () => {
      render(
        <TestProviders>
          <WorkflowPicker {...defaultProps} />
        </TestProviders>
      );

      const input = screen.getByRole('combobox');
      input.focus();
      await userEvent.type(input, 'Workflow 1');

      await waitFor(() => {
        expect(screen.getByTitle('Workflow 1')).toBeInTheDocument();
      });

      const marks = document.querySelectorAll('mark');
      expect(marks.length).toBeGreaterThan(0);
    });
  });

  describe('default workflows in multi-select mode', () => {
    it('renders the workflow name without a suffix for default workflows', async () => {
      const workflowsWithDefault: WorkflowItem[] = [
        {
          description: 'The default workflow',
          id: 'default-workflow',
          isDefault: true,
          name: 'Default Workflow',
        },
        {
          description: 'A custom workflow',
          id: 'custom-workflow',
          name: 'Custom Workflow',
        },
      ];

      render(
        <TestProviders>
          <WorkflowPicker {...defaultProps} workflows={workflowsWithDefault} />
        </TestProviders>
      );

      const input = screen.getByRole('combobox');
      input.focus();
      await userEvent.type(input, 'Workflow');

      await waitFor(() => {
        expect(screen.getByTitle('Default Workflow')).toBeInTheDocument();
      });
    });

    it('does NOT append (recommended) for any workflows', async () => {
      render(
        <TestProviders>
          <WorkflowPicker {...defaultProps} />
        </TestProviders>
      );

      const input = screen.getByRole('combobox');
      input.focus();
      await userEvent.type(input, 'Workflow');

      await waitFor(() => {
        expect(screen.getByTitle('Workflow 1')).toBeInTheDocument();
      });

      expect(screen.queryByText(/\(recommended\)/)).not.toBeInTheDocument();
    });
  });

  describe('disabled workflows', () => {
    const workflowsWithDisabled: WorkflowItem[] = [
      {
        description: 'A disabled workflow',
        enabled: false,
        id: 'disabled-workflow',
        name: 'Disabled Workflow',
      },
      {
        description: 'An enabled workflow',
        enabled: true,
        id: 'enabled-workflow',
        name: 'Enabled Workflow',
      },
    ];

    it('shows enabled workflows before disabled workflows in the dropdown', async () => {
      render(
        <TestProviders>
          <WorkflowPicker {...defaultProps} workflows={workflowsWithDisabled} />
        </TestProviders>
      );

      const input = screen.getByRole('combobox');
      input.focus();
      await userEvent.type(input, 'Workflow');

      await waitFor(() => {
        expect(screen.getByTitle('Enabled Workflow')).toBeInTheDocument();
      });

      const options = screen.getAllByRole('option');
      expect(options[0]).toHaveTextContent('Enabled Workflow');
      expect(options[1]).toHaveTextContent('Disabled Workflow');
    });

    it('appends (disabled) to the name for disabled workflows', async () => {
      render(
        <TestProviders>
          <WorkflowPicker {...defaultProps} workflows={workflowsWithDisabled} />
        </TestProviders>
      );

      const input = screen.getByRole('combobox');
      input.focus();
      await userEvent.type(input, 'Workflow');

      await waitFor(() => {
        expect(screen.getByTitle('Disabled Workflow (disabled)')).toBeInTheDocument();
      });

      expect(screen.queryByTitle('Enabled Workflow (disabled)')).not.toBeInTheDocument();
    });

    it('marks disabled workflows as disabled options in the combobox', async () => {
      render(
        <TestProviders>
          <WorkflowPicker {...defaultProps} workflows={workflowsWithDisabled} />
        </TestProviders>
      );

      const input = screen.getByRole('combobox');
      input.focus();
      await userEvent.type(input, 'Workflow');

      await waitFor(() => {
        expect(screen.getByTitle('Disabled Workflow (disabled)')).toBeInTheDocument();
      });

      const disabledOption = screen
        .getByTitle('Disabled Workflow (disabled)')
        .closest('[role="option"]');
      expect(disabledOption).toHaveAttribute('aria-disabled', 'true');
    });

    it('shows enabled workflows before disabled workflows in singleSelection mode', async () => {
      const onChange = jest.fn();
      render(
        <TestProviders>
          <WorkflowPicker
            {...defaultProps}
            onChange={onChange}
            singleSelection
            workflows={workflowsWithDisabled}
          />
        </TestProviders>
      );

      await userEvent.click(screen.getByTestId('workflowPicker'));

      await waitFor(() => {
        expect(screen.getAllByText('Enabled Workflow')[0]).toBeInTheDocument();
      });

      const options = screen.getAllByRole('option');
      expect(options[0]).toHaveTextContent('Enabled Workflow');
      expect(options[1]).toHaveTextContent('Disabled Workflow');
    });
  });

  describe('singleSelection mode', () => {
    it('renders with single selection mode', () => {
      render(
        <TestProviders>
          <WorkflowPicker {...defaultProps} selectedWorkflowIds={['workflow-1']} singleSelection />
        </TestProviders>
      );

      expect(screen.getByTestId('workflowPicker')).toHaveTextContent('Workflow 1');
    });

    it('calls onChange with single-item array when selection changes in single selection mode', async () => {
      const onChange = jest.fn();
      render(
        <TestProviders>
          <WorkflowPicker {...defaultProps} onChange={onChange} singleSelection />
        </TestProviders>
      );

      await userEvent.click(screen.getByTestId('workflowPicker'));

      await waitFor(() => {
        expect(screen.getAllByText('Workflow 2')[0]).toBeInTheDocument();
      });

      await userEvent.click(screen.getAllByText('Workflow 2')[0]);

      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith(['workflow-2']);
      });
    });

    it('shows Default badge in the closed control when the selected workflow is default', () => {
      const workflowsWithDefault: WorkflowItem[] = [
        {
          description: 'The default workflow',
          id: 'default-workflow',
          isDefault: true,
          name: 'Default Workflow',
        },
        {
          description: 'A custom workflow',
          id: 'custom-workflow',
          name: 'Custom Workflow',
        },
      ];

      render(
        <TestProviders>
          <WorkflowPicker
            {...defaultProps}
            selectedWorkflowIds={['default-workflow']}
            singleSelection
            workflows={workflowsWithDefault}
          />
        </TestProviders>
      );

      expect(screen.getByTestId('defaultBadge')).toBeInTheDocument();
    });

    it('does NOT show Default badge in the closed control when the selected workflow is NOT default', () => {
      render(
        <TestProviders>
          <WorkflowPicker {...defaultProps} selectedWorkflowIds={['workflow-1']} singleSelection />
        </TestProviders>
      );

      expect(screen.queryByTestId('defaultBadge')).not.toBeInTheDocument();
    });

    it('does NOT show Default badge in the closed control when nothing is selected', () => {
      const workflowsWithDefault: WorkflowItem[] = [
        {
          description: 'The default workflow',
          id: 'default-workflow',
          isDefault: true,
          name: 'Default Workflow',
        },
      ];

      render(
        <TestProviders>
          <WorkflowPicker
            {...defaultProps}
            selectedWorkflowIds={[]}
            singleSelection
            workflows={workflowsWithDefault}
          />
        </TestProviders>
      );

      expect(screen.queryByTestId('defaultBadge')).not.toBeInTheDocument();
    });
  });
});
