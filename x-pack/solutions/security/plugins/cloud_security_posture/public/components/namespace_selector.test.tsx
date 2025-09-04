/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NamespaceSelector } from './namespace_selector';

describe('NamespaceSelector', () => {
  const mockProps = {
    activeNamespace: 'namespace2',
    namespaces: ['default', 'namespace1', 'namespace2'],
    onNamespaceChange: jest.fn(),
  };

  beforeEach(() => {
    mockProps.onNamespaceChange.mockClear();
  });
  it('renders correctly with the active namespace', () => {
    render(<NamespaceSelector {...mockProps} />);
    const button = screen.getByTestId('namespace-selector-dropdown-button');
    expect(button).toHaveTextContent('namespace2'); // Correct: Checks for the active namespace
  });

  it('opens the popover on button click and displays namespace options', async () => {
    render(<NamespaceSelector {...mockProps} />);
    const button = screen.getByTestId('namespace-selector-dropdown-button');
    await userEvent.click(button);

    expect(await screen.findByTestId('namespace-selector-menu-item-default')).toBeVisible();
    expect(screen.getByTestId('namespace-selector-menu-item-namespace1')).toBeVisible();
    expect(screen.getByTestId('namespace-selector-menu-item-namespace2')).toBeVisible();
  });

  it('calls onNamespaceChange when a different namespace is selected', async () => {
    render(<NamespaceSelector {...mockProps} />);
    const button = screen.getByTestId('namespace-selector-dropdown-button');
    await userEvent.click(button);

    const namespace1Option = await screen.findByTestId('namespace-selector-menu-item-namespace1');
    await userEvent.click(namespace1Option);

    await waitFor(() => {
      expect(mockProps.onNamespaceChange).toHaveBeenCalledWith('namespace1');
      expect(mockProps.onNamespaceChange).toHaveBeenCalledTimes(1);
    });
  });

  it('is disabled when only one namespace is available', () => {
    const propsWithSingleNamespace = {
      ...mockProps,
      activeNamespace: 'default-disabled',
      namespaces: ['default-disabled'],
    };
    render(<NamespaceSelector {...propsWithSingleNamespace} />);
    const button = screen.getByTestId('namespace-selector-dropdown-button');

    expect(button).toBeDisabled();
    expect(button).toHaveTextContent('default-disabled');
  });
});
