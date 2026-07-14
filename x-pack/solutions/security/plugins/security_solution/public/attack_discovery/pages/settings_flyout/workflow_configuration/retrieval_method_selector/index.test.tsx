/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { RetrievalMethodSelector } from '.';
import { TestProviders } from '../../../../../common/mock';
import * as i18n from '../translations';

const defaultProps = {
  onMethodChange: jest.fn(),
  selectedMethod: 'legacy' as const,
};

describe('RetrievalMethodSelector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the retrieval method label', () => {
    render(
      <TestProviders>
        <RetrievalMethodSelector {...defaultProps} />
      </TestProviders>
    );

    expect(screen.getByText(i18n.RETRIEVAL_METHOD_LABEL)).toBeInTheDocument();
  });

  it('renders the Built-in (legacy) checkable card', () => {
    render(
      <TestProviders>
        <RetrievalMethodSelector {...defaultProps} />
      </TestProviders>
    );

    expect(screen.getByTestId('retrievalMethodLegacyCard')).toBeInTheDocument();
  });

  it('renders the Workflows checkable card', () => {
    render(
      <TestProviders>
        <RetrievalMethodSelector {...defaultProps} />
      </TestProviders>
    );

    expect(screen.getByTestId('retrievalMethodWorkflowsCard')).toBeInTheDocument();
  });

  it('renders the selector container', () => {
    render(
      <TestProviders>
        <RetrievalMethodSelector {...defaultProps} />
      </TestProviders>
    );

    expect(screen.getByTestId('retrievalMethodSelector')).toBeInTheDocument();
  });

  it('checks the legacy card when selectedMethod is legacy', () => {
    render(
      <TestProviders>
        <RetrievalMethodSelector {...defaultProps} selectedMethod="legacy" />
      </TestProviders>
    );

    const legacyRadio = screen.getByLabelText(i18n.BUILT_IN_LEGACY);

    expect(legacyRadio).toBeChecked();
  });

  it('does not check the workflows card when selectedMethod is legacy', () => {
    render(
      <TestProviders>
        <RetrievalMethodSelector {...defaultProps} selectedMethod="legacy" />
      </TestProviders>
    );

    const workflowsRadio = screen.getByLabelText(i18n.WORKFLOWS);

    expect(workflowsRadio).not.toBeChecked();
  });

  it('checks the workflows card when selectedMethod is workflows', () => {
    render(
      <TestProviders>
        <RetrievalMethodSelector {...defaultProps} selectedMethod="workflows" />
      </TestProviders>
    );

    const workflowsRadio = screen.getByLabelText(i18n.WORKFLOWS);

    expect(workflowsRadio).toBeChecked();
  });

  it('does not check the legacy card when selectedMethod is workflows', () => {
    render(
      <TestProviders>
        <RetrievalMethodSelector {...defaultProps} selectedMethod="workflows" />
      </TestProviders>
    );

    const legacyRadio = screen.getByLabelText(i18n.BUILT_IN_LEGACY);

    expect(legacyRadio).not.toBeChecked();
  });

  it('calls onMethodChange with workflows when clicking the Workflows card', async () => {
    const onMethodChange = jest.fn();

    render(
      <TestProviders>
        <RetrievalMethodSelector
          {...defaultProps}
          onMethodChange={onMethodChange}
          selectedMethod="legacy"
        />
      </TestProviders>
    );

    const workflowsRadio = screen.getByLabelText(i18n.WORKFLOWS);
    await userEvent.click(workflowsRadio);

    expect(onMethodChange).toHaveBeenCalledWith('workflows');
  });

  it('calls onMethodChange with legacy when clicking the Built-in (legacy) card', async () => {
    const onMethodChange = jest.fn();

    render(
      <TestProviders>
        <RetrievalMethodSelector
          {...defaultProps}
          onMethodChange={onMethodChange}
          selectedMethod="workflows"
        />
      </TestProviders>
    );

    const legacyRadio = screen.getByLabelText(i18n.BUILT_IN_LEGACY);
    await userEvent.click(legacyRadio);

    expect(onMethodChange).toHaveBeenCalledWith('legacy');
  });

  it('calls onMethodChange exactly once per click', async () => {
    const onMethodChange = jest.fn();

    render(
      <TestProviders>
        <RetrievalMethodSelector
          {...defaultProps}
          onMethodChange={onMethodChange}
          selectedMethod="legacy"
        />
      </TestProviders>
    );

    const workflowsRadio = screen.getByLabelText(i18n.WORKFLOWS);
    await userEvent.click(workflowsRadio);

    expect(onMethodChange).toHaveBeenCalledTimes(1);
  });

  it('does not call onMethodChange on initial render', () => {
    const onMethodChange = jest.fn();

    render(
      <TestProviders>
        <RetrievalMethodSelector {...defaultProps} onMethodChange={onMethodChange} />
      </TestProviders>
    );

    expect(onMethodChange).not.toHaveBeenCalled();
  });

  it('renders with displayName', () => {
    expect(RetrievalMethodSelector.displayName).toBe('RetrievalMethodSelector');
  });
});
