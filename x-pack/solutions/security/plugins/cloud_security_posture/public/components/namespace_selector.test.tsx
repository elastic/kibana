/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { NamespaceSelector } from './namespace_selector';

describe('NamespaceSelector', () => {
  const mockProps = {
    activeNamespace: 'namespace2',
    namespaces: ['default', 'namespace1', 'namespace2'],
    onNamespaceChange: jest.fn(),
  };
  it('renders correctly', () => {
    const { getByTestId } = render(<NamespaceSelector {...mockProps} />);
    expect(getByTestId('namespace-selector')).toBeInTheDocument();
    expect(getByTestId('namespace-selector-dropdown-button')).toHaveTextContent('namespace2');
  });

  it('opens the popover on button click', async () => {
    const { getByTestId } = render(<NamespaceSelector {...mockProps} />);
    const button = getByTestId('namespace-selector-dropdown-button');
    button.click();
    await waitFor(() => {
      expect(getByTestId('namespace-selector-menu')).toBeVisible();
      expect(getByTestId('namespace-selector-menu')).toHaveTextContent('default');
      expect(getByTestId('namespace-selector-menu')).toHaveTextContent('namespace1');
      expect(getByTestId('namespace-selector-menu')).toHaveTextContent('namespace2');
    });
  });

  it('calls onNamespaceChange when a namespace is selected', async () => {
    const { getByTestId } = render(<NamespaceSelector {...mockProps} />);
    const button = getByTestId('namespace-selector-dropdown-button');
    button.click();

    await waitFor(() => {
      expect(getByTestId('namespace-selector-menu')).toBeVisible();
    });

    const namespace1 = getByTestId('namespace-selector-menu-item-namespace1');
    namespace1.click();

    await waitFor(() => {
      expect(mockProps.onNamespaceChange).toHaveBeenCalledWith('namespace1');
    });
  });

  it('is disabled when only one namespace is available', () => {
    const propsWithSingleNamespace = {
      ...mockProps,
      activeNamespace: 'default-disabled',
      namespaces: ['default-disabled'],
    };
    const { getByTestId } = render(<NamespaceSelector {...propsWithSingleNamespace} />);
    const button = getByTestId('namespace-selector-dropdown-button');
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent('Namespace: default-disabled');
  });
});
