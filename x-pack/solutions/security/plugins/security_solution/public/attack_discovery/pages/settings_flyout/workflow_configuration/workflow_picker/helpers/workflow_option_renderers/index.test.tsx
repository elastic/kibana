/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import {
  getWorkflowOptionValue,
  renderSuperSelectDropdownDisplay,
  renderSuperSelectInputDisplay,
  renderWorkflowOption,
} from '.';
import type { WorkflowOption } from '.';

describe('getWorkflowOptionValue', () => {
  it('returns an object with the expected properties', () => {
    const result = getWorkflowOptionValue({
      description: 'A test workflow',
      enabled: true,
      id: 'test-id',
      isDefault: false,
    });

    expect(result).toEqual({
      description: 'A test workflow',
      enabled: true,
      id: 'test-id',
      isDefault: false,
    });
  });

  it('handles undefined optional fields', () => {
    const result = getWorkflowOptionValue({
      description: 'Minimal workflow',
      id: 'minimal-id',
    });

    expect(result).toEqual({
      description: 'Minimal workflow',
      enabled: undefined,
      id: 'minimal-id',
      isDefault: undefined,
    });
  });
});

describe('renderWorkflowOption', () => {
  it('renders the option label', () => {
    const option: WorkflowOption = {
      label: 'Test Workflow',
      value: {
        description: 'A description',
        id: 'test-id',
      },
    };

    render(<>{renderWorkflowOption(option, '', 'contentClass')}</>);

    expect(screen.getByText('Test Workflow')).toBeInTheDocument();
  });

  it('renders the description when present', () => {
    const option: WorkflowOption = {
      label: 'Test Workflow',
      value: {
        description: 'A workflow description',
        id: 'test-id',
      },
    };

    render(<>{renderWorkflowOption(option, '', 'contentClass')}</>);

    expect(screen.getByText('A workflow description')).toBeInTheDocument();
  });

  it('does not render a description element when description is empty', () => {
    const option: WorkflowOption = {
      label: 'Test Workflow',
      value: {
        description: '',
        id: 'test-id',
      },
    };

    render(<>{renderWorkflowOption(option, '', 'contentClass')}</>);

    expect(screen.queryByTestId('workflowOptionDescription')).not.toBeInTheDocument();
  });

  it('does not render a description element when value is undefined', () => {
    const option: WorkflowOption = {
      label: 'Test Workflow',
    };

    render(<>{renderWorkflowOption(option, '', 'contentClass')}</>);

    expect(screen.queryByTestId('workflowOptionDescription')).not.toBeInTheDocument();
  });
});

describe('renderSuperSelectInputDisplay', () => {
  it('renders the workflow name', () => {
    render(<>{renderSuperSelectInputDisplay({ name: 'My Workflow' })}</>);

    expect(screen.getByText('My Workflow')).toBeInTheDocument();
  });

  it('renders the Default badge when isDefault is true', () => {
    render(<>{renderSuperSelectInputDisplay({ isDefault: true, name: 'Default Workflow' })}</>);

    expect(screen.getByTestId('defaultBadge')).toBeInTheDocument();
  });

  it('does not render the Default badge when isDefault is false', () => {
    render(<>{renderSuperSelectInputDisplay({ isDefault: false, name: 'Custom Workflow' })}</>);

    expect(screen.queryByTestId('defaultBadge')).not.toBeInTheDocument();
  });

  it('does not render the Default badge when isDefault is undefined', () => {
    render(<>{renderSuperSelectInputDisplay({ name: 'Custom Workflow' })}</>);

    expect(screen.queryByTestId('defaultBadge')).not.toBeInTheDocument();
  });

  it('appends the disabled suffix when enabled is false', () => {
    render(<>{renderSuperSelectInputDisplay({ enabled: false, name: 'Disabled Workflow' })}</>);

    expect(screen.getByText('Disabled Workflow (disabled)')).toBeInTheDocument();
  });
});

describe('renderSuperSelectDropdownDisplay', () => {
  it('renders the workflow name', () => {
    render(
      <>{renderSuperSelectDropdownDisplay({ description: 'A description', name: 'My Workflow' })}</>
    );

    expect(screen.getByText('My Workflow')).toBeInTheDocument();
  });

  it('renders the description', () => {
    render(
      <>
        {renderSuperSelectDropdownDisplay({
          description: 'Workflow description here',
          name: 'My Workflow',
        })}
      </>
    );

    expect(screen.getByText('Workflow description here')).toBeInTheDocument();
  });

  it('does not render a description element when description is empty', () => {
    render(<>{renderSuperSelectDropdownDisplay({ description: '', name: 'My Workflow' })}</>);

    expect(screen.queryByTestId('workflowOptionDescription')).not.toBeInTheDocument();
  });

  it('renders the Default badge when isDefault is true', () => {
    render(
      <>
        {renderSuperSelectDropdownDisplay({
          description: 'Desc',
          isDefault: true,
          name: 'Default Workflow',
        })}
      </>
    );

    expect(screen.getByTestId('defaultBadgeDropdown')).toBeInTheDocument();
  });

  it('does not render the Default badge when isDefault is false', () => {
    render(
      <>
        {renderSuperSelectDropdownDisplay({
          description: 'Desc',
          isDefault: false,
          name: 'Custom Workflow',
        })}
      </>
    );

    expect(screen.queryByTestId('defaultBadgeDropdown')).not.toBeInTheDocument();
  });

  it('appends the disabled suffix when enabled is false', () => {
    render(
      <>
        {renderSuperSelectDropdownDisplay({
          description: 'Desc',
          enabled: false,
          name: 'Disabled Workflow',
        })}
      </>
    );

    expect(screen.getByText('Disabled Workflow (disabled)')).toBeInTheDocument();
  });
});
