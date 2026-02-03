/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import type { MigrationNameInputProps } from './migration_name_input';
import { MigrationNameInput } from './migration_name_input';
import * as i18n from './translations';

const mockSetMigrationName = jest.fn();

const defaultProps: MigrationNameInputProps = {
  migrationName: 'Default Name',
  setMigrationName: mockSetMigrationName,
};

describe('MigrationNameInput', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with default name', () => {
    render(<MigrationNameInput {...defaultProps} />);
    expect(screen.getByDisplayValue('Default Name')).toBeInTheDocument();
  });

  it('updates name on input change', () => {
    render(<MigrationNameInput {...defaultProps} />);
    const input = screen.getByDisplayValue('Default Name');

    fireEvent.change(input, { target: { value: 'New Name' } });
    expect(input).toHaveValue('New Name');
  });

  it('saves name on blur', () => {
    render(<MigrationNameInput {...defaultProps} />);
    const input = screen.getByDisplayValue('Default Name');

    fireEvent.change(input, { target: { value: 'New Name' } });
    fireEvent.blur(input);

    expect(mockSetMigrationName).toHaveBeenCalledWith('New Name');
  });

  it('saves name on enter key', () => {
    render(<MigrationNameInput {...defaultProps} />);
    const input = screen.getByDisplayValue('Default Name');

    fireEvent.change(input, { target: { value: 'New Name' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(mockSetMigrationName).toHaveBeenCalledWith('New Name');
  });

  it('does not accept empty string as migration name', () => {
    render(<MigrationNameInput {...defaultProps} />);
    const input = screen.getByDisplayValue('Default Name');

    fireEvent.change(input, { target: { value: '       ' } });
    fireEvent.blur(input);

    expect(mockSetMigrationName).toHaveBeenCalledWith('');
    expect(screen.getByText(i18n.MIGRATION_NAME_INPUT_ERROR)).toBeInTheDocument();
  });

  it('shows error when empty name is submitted', () => {
    render(<MigrationNameInput {...defaultProps} />);
    const input = screen.getByDisplayValue('Default Name');

    fireEvent.change(input, { target: { value: '' } });
    fireEvent.blur(input);

    expect(screen.getByText(i18n.MIGRATION_NAME_INPUT_ERROR)).toBeInTheDocument();
    expect(mockSetMigrationName).toHaveBeenCalled();
  });

  it('focuses input on mount', () => {
    const { container } = render(<MigrationNameInput {...defaultProps} />);
    const input = container.querySelector('input');

    expect(document.activeElement).toBe(input);
  });
});
