/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen } from '@testing-library/react';

import { renderWithPndProviders } from '../test_utils/render_with_pnd_providers';
import { SchemaForm } from '.';
import { PND_GATE_SCHEMA, PND_GATE_SCHEMAS } from './test_helpers/pnd_gate_schema';

const onChange = jest.fn();

const defaultProps = {
  onChange,
  schema: PND_GATE_SCHEMA,
  values: {},
};

describe('SchemaForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the form', () => {
    renderWithPndProviders(<SchemaForm {...defaultProps} />);

    expect(screen.getByTestId('pndSchemaForm')).toBeInTheDocument();
  });

  it('renders one control per property', () => {
    renderWithPndProviders(<SchemaForm {...defaultProps} />);

    expect(screen.getAllByTestId(/^pndSchemaFormControl-/)).toHaveLength(2);
  });

  it('renders the properties in the order the schema declares them', () => {
    renderWithPndProviders(<SchemaForm {...defaultProps} />);

    expect(
      screen.getAllByTestId(/^pndSchemaFormControl-/).map((control) => control.dataset.testSubj)
    ).toEqual(['pndSchemaFormControl-decision', 'pndSchemaFormControl-rationale']);
  });

  it('renders nothing for a schema that declares no properties', () => {
    renderWithPndProviders(<SchemaForm {...defaultProps} schema={{ properties: {} }} />);

    expect(screen.queryByTestId('pndSchemaForm')).not.toBeInTheDocument();
  });

  describe.each(Object.entries(PND_GATE_SCHEMAS))('the %s gate schema', (gateId, schema) => {
    it('renders the decision as a select', () => {
      renderWithPndProviders(<SchemaForm {...defaultProps} schema={schema} />);

      expect(screen.getByTestId('pndSchemaFormControl-decision').tagName).toBe('SELECT');
    });

    it('renders the rationale as a text field', () => {
      renderWithPndProviders(<SchemaForm {...defaultProps} schema={schema} />);

      expect(screen.getByTestId('pndSchemaFormControl-rationale')).toHaveAttribute('type', 'text');
    });

    it('marks the decision required', () => {
      renderWithPndProviders(<SchemaForm {...defaultProps} schema={schema} />);

      expect(screen.getByTestId('pndSchemaFormRequired-decision')).toBeInTheDocument();
    });

    it('marks the rationale required', () => {
      renderWithPndProviders(<SchemaForm {...defaultProps} schema={schema} />);

      expect(screen.getByTestId('pndSchemaFormRequired-rationale')).toBeInTheDocument();
    });
  });

  describe('reporting a change', () => {
    it('merges the answer into the values it was given', () => {
      renderWithPndProviders(
        <SchemaForm {...defaultProps} values={{ rationale: 'Confirmed malicious' }} />
      );

      fireEvent.change(screen.getByTestId('pndSchemaFormControl-decision'), {
        target: { value: 'approve' },
      });

      expect(onChange).toHaveBeenCalledWith({
        decision: 'approve',
        rationale: 'Confirmed malicious',
      });
    });

    it('drops the key when a field is cleared, rather than sending an undefined', () => {
      renderWithPndProviders(
        <SchemaForm {...defaultProps} values={{ decision: 'approve', rationale: 'x' }} />
      );

      fireEvent.change(screen.getByTestId('pndSchemaFormControl-rationale'), {
        target: { value: '' },
      });

      expect(onChange).toHaveBeenCalledWith({ decision: 'approve' });
    });

    it('leaves the values it was given untouched', () => {
      const values = { rationale: 'Confirmed malicious' };

      renderWithPndProviders(<SchemaForm {...defaultProps} values={values} />);
      fireEvent.change(screen.getByTestId('pndSchemaFormControl-decision'), {
        target: { value: 'approve' },
      });

      expect(values).toEqual({ rationale: 'Confirmed malicious' });
    });
  });

  it('renders the current value of every field', () => {
    renderWithPndProviders(
      <SchemaForm {...defaultProps} values={{ decision: 'dismiss', rationale: 'False positive' }} />
    );

    expect(screen.getByTestId('pndSchemaFormControl-rationale')).toHaveValue('False positive');
  });

  it('renders the error the caller reports for a field', () => {
    renderWithPndProviders(
      <SchemaForm {...defaultProps} errors={{ decision: 'This field is required' }} />
    );

    expect(screen.getByText('This field is required')).toBeInTheDocument();
  });

  it('disables every control when the form is disabled', () => {
    renderWithPndProviders(<SchemaForm {...defaultProps} disabled={true} />);

    expect(screen.getByTestId('pndSchemaFormControl-rationale')).toBeDisabled();
  });
});
