/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen } from '@testing-library/react';

import { renderWithPndProviders } from '../../test_utils/render_with_pnd_providers';
import { FixedDecisionForm } from '.';

const onChange = jest.fn();

const defaultProps = {
  onChange,
  values: {},
};

describe('FixedDecisionForm', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders the decision control', () => {
    renderWithPndProviders(<FixedDecisionForm {...defaultProps} />);

    expect(screen.getByTestId('pndFixedDecisionFormControl-decision')).toBeInTheDocument();
  });

  it('renders the rationale control', () => {
    renderWithPndProviders(<FixedDecisionForm {...defaultProps} />);

    expect(screen.getByTestId('pndFixedDecisionFormControl-rationale')).toBeInTheDocument();
  });

  it('reports the whole value map when a decision is chosen', () => {
    renderWithPndProviders(<FixedDecisionForm {...defaultProps} values={{ rationale: 'why' }} />);

    fireEvent.change(screen.getByTestId('pndFixedDecisionFormControl-decision'), {
      target: { value: 'dismiss' },
    });

    expect(onChange).toBeCalledWith({ decision: 'dismiss', rationale: 'why' });
  });

  it('reports the whole value map when a rationale is typed', () => {
    renderWithPndProviders(
      <FixedDecisionForm {...defaultProps} values={{ decision: 'approve' }} />
    );

    fireEvent.change(screen.getByTestId('pndFixedDecisionFormControl-rationale'), {
      target: { value: 'the host is contained' },
    });

    expect(onChange).toBeCalledWith({ decision: 'approve', rationale: 'the host is contained' });
  });

  it('drops the key when a field is emptied, rather than reporting an empty answer', () => {
    renderWithPndProviders(
      <FixedDecisionForm {...defaultProps} values={{ decision: 'approve', rationale: 'why' }} />
    );

    fireEvent.change(screen.getByTestId('pndFixedDecisionFormControl-rationale'), {
      target: { value: '' },
    });

    expect(onChange).toBeCalledWith({ decision: 'approve' });
  });

  it('renders a validation message in place', () => {
    renderWithPndProviders(
      <FixedDecisionForm {...defaultProps} errors={{ rationale: 'This field is required' }} />
    );

    expect(screen.getByText('This field is required')).toBeInTheDocument();
  });

  it('disables the rationale while a decision is in flight', () => {
    renderWithPndProviders(<FixedDecisionForm {...defaultProps} disabled />);

    expect(screen.getByTestId('pndFixedDecisionFormControl-rationale')).toBeDisabled();
  });

  it('disables the decision while a decision is in flight', () => {
    renderWithPndProviders(<FixedDecisionForm {...defaultProps} disabled />);

    expect(screen.getByTestId('pndFixedDecisionFormControl-decision')).toBeDisabled();
  });

  it('names the decision control for a screen reader, which its form row label cannot do', () => {
    renderWithPndProviders(<FixedDecisionForm {...defaultProps} />);

    expect(screen.getByRole('combobox', { name: 'Decision' })).toBeInTheDocument();
  });

  it('bounds the rationale to what _respond accepts', () => {
    renderWithPndProviders(<FixedDecisionForm {...defaultProps} />);

    expect(screen.getByTestId('pndFixedDecisionFormControl-rationale')).toHaveAttribute(
      'maxLength',
      '2000'
    );
  });
});
