/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { GenerateWorkflowModal } from '.';
import {
  CANCEL,
  DESCRIBE_YOUR_WORKFLOW,
  GENERATE_WORKFLOW,
  GENERATE_WORKFLOW_TITLE,
  MODEL,
  WORKFLOW_DESCRIPTION_PLACEHOLDER,
} from './translations';

jest.mock('../../../../../common/hooks/use_space_id', () => ({
  useSpaceId: jest.fn().mockReturnValue('default'),
}));

jest.mock('@kbn/elastic-assistant', () => ({
  AssistantSpaceIdProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  ConnectorSelectorInline: () => <div data-test-subj="connectorSelectorInline" />,
}));

const defaultProps = {
  connectorId: 'test-connector-id',
  isGenerating: false,
  onClose: jest.fn(),
  onGenerate: jest.fn(),
};

describe('GenerateWorkflowModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the modal with the expected title', () => {
    render(<GenerateWorkflowModal {...defaultProps} />);

    expect(screen.getByTestId('title')).toHaveTextContent(GENERATE_WORKFLOW_TITLE);
  });

  it('renders the text area label', () => {
    render(<GenerateWorkflowModal {...defaultProps} />);

    expect(screen.getByTestId('descriptionLabel')).toHaveTextContent(DESCRIBE_YOUR_WORKFLOW);
  });

  it('renders the text area with the expected placeholder', () => {
    render(<GenerateWorkflowModal {...defaultProps} />);

    expect(screen.getByTestId('description')).toHaveAttribute(
      'placeholder',
      WORKFLOW_DESCRIPTION_PLACEHOLDER
    );
  });

  it('renders the Generate workflow button with the expected text', () => {
    render(<GenerateWorkflowModal {...defaultProps} />);

    expect(screen.getByTestId('generate')).toHaveTextContent(GENERATE_WORKFLOW);
  });

  it('renders the Cancel button with the expected text', () => {
    render(<GenerateWorkflowModal {...defaultProps} />);

    expect(screen.getByTestId('cancel')).toHaveTextContent(CANCEL);
  });

  it('renders the model label', () => {
    render(<GenerateWorkflowModal {...defaultProps} />);

    expect(screen.getByText(MODEL)).toBeInTheDocument();
  });

  it('renders the connector selector', () => {
    render(<GenerateWorkflowModal {...defaultProps} />);

    expect(screen.getByTestId('connectorSelectorInline')).toBeInTheDocument();
  });

  it('disables the Generate button when the description is empty', () => {
    render(<GenerateWorkflowModal {...defaultProps} />);

    expect(screen.getByTestId('generate')).toBeDisabled();
  });

  it('enables the Generate button when the description is not empty', () => {
    render(<GenerateWorkflowModal {...defaultProps} />);

    fireEvent.change(screen.getByTestId('description'), {
      target: { value: 'Retrieve alerts from the last 24 hours' },
    });

    expect(screen.getByTestId('generate')).toBeEnabled();
  });

  it('disables the Generate button when description contains only whitespace', () => {
    render(<GenerateWorkflowModal {...defaultProps} />);

    fireEvent.change(screen.getByTestId('description'), {
      target: { value: '   ' },
    });

    expect(screen.getByTestId('generate')).toBeDisabled();
  });

  it('disables the Generate button when connectorId is undefined', () => {
    render(<GenerateWorkflowModal {...defaultProps} connectorId={undefined} />);

    fireEvent.change(screen.getByTestId('description'), {
      target: { value: 'Retrieve alerts from the last 24 hours' },
    });

    expect(screen.getByTestId('generate')).toBeDisabled();
  });

  it('calls onGenerate with the description and connectorId when the Generate button is clicked', () => {
    render(<GenerateWorkflowModal {...defaultProps} />);

    const description = 'Retrieve alerts from the last 24 hours';

    fireEvent.change(screen.getByTestId('description'), {
      target: { value: description },
    });

    fireEvent.click(screen.getByTestId('generate'));

    expect(defaultProps.onGenerate).toHaveBeenCalledTimes(1);
    expect(defaultProps.onGenerate).toHaveBeenCalledWith(description, 'test-connector-id');
  });

  it('calls onClose when the Cancel button is clicked', () => {
    render(<GenerateWorkflowModal {...defaultProps} />);

    fireEvent.click(screen.getByTestId('cancel'));

    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the modal is dismissed via the close button', () => {
    render(<GenerateWorkflowModal {...defaultProps} />);

    const closeButton = screen.getByLabelText('Closes this modal window');

    fireEvent.click(closeButton);

    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('disables the Generate button when isGenerating is true', () => {
    render(<GenerateWorkflowModal {...defaultProps} isGenerating={true} />);

    fireEvent.change(screen.getByTestId('description'), {
      target: { value: 'Retrieve alerts from the last 24 hours' },
    });

    expect(screen.getByTestId('generate')).toBeDisabled();
  });

  it('disables the text area when isGenerating is true', () => {
    render(<GenerateWorkflowModal {...defaultProps} isGenerating={true} />);

    expect(screen.getByTestId('description')).toBeDisabled();
  });
});
