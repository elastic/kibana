/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen } from '@testing-library/react';

import { renderWithPndProviders } from '../../test_utils/render_with_pnd_providers';
import { MAX_SCHEMA_STRING_LENGTH, SchemaFormField } from '.';
import * as i18n from '../translations';

const onChange = jest.fn();

const defaultProps = {
  disabled: false,
  error: undefined,
  field: { type: 'string' as const },
  isRequired: false,
  name: 'rationale',
  onChange,
  value: undefined,
};

describe('SchemaFormField', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('labelling', () => {
    it('labels the row with the schema title', () => {
      renderWithPndProviders(
        <SchemaFormField {...defaultProps} field={{ title: 'Your rationale', type: 'string' }} />
      );

      expect(screen.getByLabelText('Your rationale')).toBeInTheDocument();
    });

    it('falls back to the property name when the schema declares no title', () => {
      renderWithPndProviders(<SchemaFormField {...defaultProps} />);

      expect(screen.getByLabelText('rationale')).toBeInTheDocument();
    });

    it('renders the description as help text', () => {
      renderWithPndProviders(
        <SchemaFormField
          {...defaultProps}
          field={{ description: 'Why you decided', type: 'string' }}
        />
      );

      expect(screen.getByText('Why you decided')).toBeInTheDocument();
    });

    it('marks a required field, because EuiFormRow has no isRequired', () => {
      renderWithPndProviders(<SchemaFormField {...defaultProps} isRequired={true} />);

      expect(screen.getByTestId('pndSchemaFormRequired-rationale')).toBeInTheDocument();
    });

    it('does not mark an optional field', () => {
      renderWithPndProviders(<SchemaFormField {...defaultProps} />);

      expect(screen.queryByTestId('pndSchemaFormRequired-rationale')).not.toBeInTheDocument();
    });

    it('announces a required field to screen readers', () => {
      renderWithPndProviders(<SchemaFormField {...defaultProps} isRequired={true} />);

      expect(screen.getByText(i18n.REQUIRED_FIELD)).toBeInTheDocument();
    });

    it('renders the error the caller passed', () => {
      renderWithPndProviders(<SchemaFormField {...defaultProps} error="This field is required" />);

      expect(screen.getByText('This field is required')).toBeInTheDocument();
    });
  });

  describe('a string field', () => {
    it('renders a text field', () => {
      renderWithPndProviders(<SchemaFormField {...defaultProps} />);

      expect(screen.getByTestId('pndSchemaFormControl-rationale')).toHaveAttribute('type', 'text');
    });

    it('bounds the value at the length the _respond route accepts', () => {
      renderWithPndProviders(<SchemaFormField {...defaultProps} />);

      expect(screen.getByTestId('pndSchemaFormControl-rationale')).toHaveAttribute(
        'maxlength',
        String(MAX_SCHEMA_STRING_LENGTH)
      );
    });

    it('renders the current value', () => {
      renderWithPndProviders(<SchemaFormField {...defaultProps} value="Confirmed malicious" />);

      expect(screen.getByTestId('pndSchemaFormControl-rationale')).toHaveValue(
        'Confirmed malicious'
      );
    });

    it('renders an empty field for a value that is not a string', () => {
      renderWithPndProviders(<SchemaFormField {...defaultProps} value={7} />);

      expect(screen.getByTestId('pndSchemaFormControl-rationale')).toHaveValue('');
    });

    it('reports what was typed', () => {
      renderWithPndProviders(<SchemaFormField {...defaultProps} />);

      fireEvent.change(screen.getByTestId('pndSchemaFormControl-rationale'), {
        target: { value: 'Confirmed malicious' },
      });

      expect(onChange).toHaveBeenCalledWith('Confirmed malicious');
    });

    it('reports a cleared field as unanswered', () => {
      renderWithPndProviders(<SchemaFormField {...defaultProps} value="x" />);

      fireEvent.change(screen.getByTestId('pndSchemaFormControl-rationale'), {
        target: { value: '' },
      });

      expect(onChange).toHaveBeenCalledWith(undefined);
    });

    it('disables the control when the form is disabled', () => {
      renderWithPndProviders(<SchemaFormField {...defaultProps} disabled={true} />);

      expect(screen.getByTestId('pndSchemaFormControl-rationale')).toBeDisabled();
    });
  });

  describe('a number field', () => {
    const numberProps = { ...defaultProps, field: { type: 'number' as const }, name: 'count' };

    it('renders a number field', () => {
      renderWithPndProviders(<SchemaFormField {...numberProps} />);

      expect(screen.getByTestId('pndSchemaFormControl-count')).toHaveAttribute('type', 'number');
    });

    it('reports the typed value as a number', () => {
      renderWithPndProviders(<SchemaFormField {...numberProps} />);

      fireEvent.change(screen.getByTestId('pndSchemaFormControl-count'), {
        target: { value: '7' },
      });

      expect(onChange).toHaveBeenCalledWith(7);
    });

    it('reports a cleared field as unanswered', () => {
      renderWithPndProviders(<SchemaFormField {...numberProps} value={7} />);

      fireEvent.change(screen.getByTestId('pndSchemaFormControl-count'), { target: { value: '' } });

      expect(onChange).toHaveBeenCalledWith(undefined);
    });

    it('renders zero rather than an empty field', () => {
      renderWithPndProviders(<SchemaFormField {...numberProps} value={0} />);

      expect(screen.getByTestId('pndSchemaFormControl-count')).toHaveValue(0);
    });
  });

  describe('a boolean field', () => {
    const booleanProps = {
      ...defaultProps,
      field: { type: 'boolean' as const },
      name: 'acknowledged',
    };

    it('renders a switch', () => {
      renderWithPndProviders(<SchemaFormField {...booleanProps} />);

      expect(screen.getByTestId('pndSchemaFormControl-acknowledged')).toBeInTheDocument();
    });

    it('renders an untouched switch unchecked', () => {
      renderWithPndProviders(<SchemaFormField {...booleanProps} />);

      expect(screen.getByTestId('pndSchemaFormControl-acknowledged')).not.toBeChecked();
    });

    it('renders a true value checked', () => {
      renderWithPndProviders(<SchemaFormField {...booleanProps} value={true} />);

      expect(screen.getByTestId('pndSchemaFormControl-acknowledged')).toBeChecked();
    });

    it('reports the toggled value', () => {
      renderWithPndProviders(<SchemaFormField {...booleanProps} />);

      fireEvent.click(screen.getByTestId('pndSchemaFormControl-acknowledged'));

      expect(onChange).toHaveBeenCalledWith(true);
    });
  });

  describe('an enum field', () => {
    const enumProps = {
      ...defaultProps,
      field: { enum: ['approve', 'dismiss'], type: 'string' as const },
      name: 'decision',
    };

    it('names itself, because a select cannot lean on the form row label', () => {
      renderWithPndProviders(<SchemaFormField {...enumProps} />);

      expect(screen.getByTestId('pndSchemaFormControl-decision')).toHaveAttribute(
        'aria-label',
        'decision'
      );
    });

    it('carries the required state into its own name', () => {
      renderWithPndProviders(<SchemaFormField {...enumProps} isRequired={true} />);

      expect(screen.getByTestId('pndSchemaFormControl-decision')).toHaveAttribute(
        'aria-label',
        i18n.requiredFieldAriaLabel('decision')
      );
    });

    it('renders a select rather than a text field', () => {
      renderWithPndProviders(<SchemaFormField {...enumProps} />);

      expect(screen.getByTestId('pndSchemaFormControl-decision').tagName).toBe('SELECT');
    });

    it('leads with a placeholder option', () => {
      renderWithPndProviders(<SchemaFormField {...enumProps} />);

      expect(screen.getByRole('option', { name: i18n.SELECT_PLACEHOLDER })).toHaveValue('');
    });

    it('renders one option per enum member', () => {
      renderWithPndProviders(<SchemaFormField {...enumProps} />);

      expect(screen.getAllByRole('option')).toHaveLength(3);
    });

    it('renders the current value as selected', () => {
      renderWithPndProviders(<SchemaFormField {...enumProps} value="dismiss" />);

      expect(screen.getByTestId('pndSchemaFormControl-decision')).toHaveValue('dismiss');
    });

    it('reports the chosen value', () => {
      renderWithPndProviders(<SchemaFormField {...enumProps} />);

      fireEvent.change(screen.getByTestId('pndSchemaFormControl-decision'), {
        target: { value: 'approve' },
      });

      expect(onChange).toHaveBeenCalledWith('approve');
    });

    it('reports the placeholder as unanswered', () => {
      renderWithPndProviders(<SchemaFormField {...enumProps} value="approve" />);

      fireEvent.change(screen.getByTestId('pndSchemaFormControl-decision'), {
        target: { value: '' },
      });

      expect(onChange).toHaveBeenCalledWith(undefined);
    });

    it('coerces the chosen value to a number for a numeric enum', () => {
      renderWithPndProviders(
        <SchemaFormField {...enumProps} field={{ enum: [1, 2], type: 'number' }} name="level" />
      );

      fireEvent.change(screen.getByTestId('pndSchemaFormControl-level'), {
        target: { value: '2' },
      });

      expect(onChange).toHaveBeenCalledWith(2);
    });
  });

  describe('an array field', () => {
    const arrayProps = {
      ...defaultProps,
      field: { items: { enum: ['contain', 'escalate'] }, type: 'array' as const },
      name: 'tags',
    };

    it('renders a combo box', () => {
      renderWithPndProviders(<SchemaFormField {...arrayProps} />);

      expect(screen.getByTestId('pndSchemaFormControl-tags')).toBeInTheDocument();
    });

    // The combo box forwards `aria-label` to its search input rather than to
    // the wrapper that carries the test subject.
    it('names itself, because a combo box cannot lean on the form row label', () => {
      renderWithPndProviders(<SchemaFormField {...arrayProps} />);

      expect(screen.getByRole('combobox', { name: 'tags' })).toBeInTheDocument();
    });

    it('renders the selected values', () => {
      renderWithPndProviders(<SchemaFormField {...arrayProps} value={['contain']} />);

      expect(screen.getByTestId('pndSchemaFormControl-tags')).toHaveTextContent('contain');
    });

    it('renders nothing selected for a value that is not an array', () => {
      renderWithPndProviders(<SchemaFormField {...arrayProps} value="contain" />);

      expect(screen.getByTestId('pndSchemaFormControl-tags')).not.toHaveTextContent('contain');
    });
  });
});
