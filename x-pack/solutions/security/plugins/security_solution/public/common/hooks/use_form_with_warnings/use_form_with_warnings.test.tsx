/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { TextField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import type { FieldConfig, ValidationError } from '../../../shared_imports';
import { Form, UseField } from '../../../shared_imports';
import type { FormWithWarningsSubmitHandler } from './use_form_with_warnings';
import { useFormWithWarnings } from './use_form_with_warnings';

describe('useFormWithWarn', () => {
  describe('isValid', () => {
    it('is `undefined` initially', async () => {
      render(<TestForm warningValidationCodes={['warning']} />);

      await waitFor(() => {
        expect(screen.getByText('isValid: "undefined"')).toBeInTheDocument();
      });
    });

    it('is `true` when input is valid', async () => {
      render(<TestForm warningValidationCodes={['warning']} />);

      await typeText('someValue');
      await submitForm();

      await waitFor(() => {
        expect(screen.getByText('isValid: true')).toBeInTheDocument();
      });
    });

    it('is `true` when input has warnings', async () => {
      render(<TestForm warningValidationCodes={['warning']} />);

      await typeText('warning');
      await submitForm();

      await waitFor(() => {
        expect(screen.getByText('isValid: true')).toBeInTheDocument();
      });
    });

    it('is `false` when input has error', async () => {
      render(<TestForm warningValidationCodes={['warning']} />);

      await typeText('error');
      await submitForm();

      await waitFor(() => {
        expect(screen.getByText('isValid: false')).toBeInTheDocument();
      });
    });
  });

  describe('isSubmitting', () => {
    it('toggles upon form submission', async () => {
      render(<TestForm warningValidationCodes={['warning']} />, { legacyRoot: true });

      expect(screen.getByText('isSubmitting: false')).toBeInTheDocument();

      const finishAct = submitForm();

      expect(screen.getByText('isSubmitting: true')).toBeInTheDocument();

      await finishAct;
      await waitFor(() => {
        expect(screen.getByText('isSubmitting: false')).toBeInTheDocument();
      });
    });
  });

  describe('isSubmitted', () => {
    it('switched to true after form submission', async () => {
      render(<TestForm warningValidationCodes={['warning']} />);

      expect(screen.getByText('isSubmitted: false')).toBeInTheDocument();

      await submitForm();

      await waitFor(() => {
        expect(screen.getByText('isSubmitted: true')).toBeInTheDocument();
      });
    });
  });

  describe('input w/o warnings', () => {
    it('submits form successfully', async () => {
      const handleSubmit = jest.fn();

      render(<TestForm warningValidationCodes={['warning']} onSubmit={handleSubmit} />);
      await typeText('someValue');

      await submitForm();

      await waitFor(() => {
        expect(handleSubmit).toHaveBeenCalledWith({ testField: 'someValue' }, true, {
          errors: [],
          warnings: [],
        });
      });
    });
  });

  describe('w/ warnings', () => {
    it('submits form successfully', async () => {
      const handleSubmit = jest.fn();

      render(<TestForm warningValidationCodes={['warning']} onSubmit={handleSubmit} />);
      await typeText('warning');

      await submitForm();

      await waitFor(() => {
        expect(handleSubmit).toHaveBeenCalledWith({ testField: 'warning' }, true, {
          errors: [],
          warnings: [
            expect.objectContaining({
              code: 'warning',
              message: 'Validation warning',
              path: 'testField',
            }),
          ],
        });
      });
    });
  });

  describe('w/ errors', () => {
    it('passes validation errors to submit handler', async () => {
      const handleSubmit = jest.fn();

      render(<TestForm warningValidationCodes={['warning']} onSubmit={handleSubmit} />);
      await typeText('error');

      await submitForm();

      await waitFor(() => {
        expect(handleSubmit).toHaveBeenCalledWith({}, false, {
          errors: [
            expect.objectContaining({
              code: 'error',
              message: 'Validation error',
              path: 'testField',
            }),
          ],
          warnings: [],
        });
      });
    });
  });

  describe('w/ a newer validation still running', () => {
    const warning = { code: 'warning', message: 'Validation warning' };

    // Submits, then starts a second validation before the first one finishes, which supersedes it.
    // Returns the resolvers of the pending validations in the order they were started.
    const submitWithSupersededValidation = async (
      handleSubmit: FormWithWarningsSubmitHandler
    ): Promise<Array<(error?: ValidationError) => void>> => {
      const pendingValidations: Array<(error?: ValidationError) => void> = [];
      const asyncValidator = (): Promise<ValidationError | undefined> =>
        new Promise((resolve) => pendingValidations.push(resolve));

      render(
        <TestForm
          warningValidationCodes={['warning']}
          onSubmit={handleSubmit}
          asyncValidator={asyncValidator}
        />
      );

      await submitForm();
      await waitFor(() => expect(pendingValidations).toHaveLength(1));

      await typeText('someValue');
      await waitFor(() => expect(pendingValidations).toHaveLength(2));

      return pendingValidations;
    };

    afterEach(() => {
      jest.useRealTimers();
    });

    it('waits for it and passes its warnings to the submit handler', async () => {
      const handleSubmit = jest.fn();
      const pendingValidations = await submitWithSupersededValidation(handleSubmit);

      await act(async () => {
        pendingValidations[0](warning);
      });
      await act(() => new Promise((resolve) => setTimeout(resolve, 200)));

      expect(handleSubmit).not.toHaveBeenCalled();

      await act(async () => {
        pendingValidations[1](warning);
      });

      await waitFor(() => {
        expect(handleSubmit).toHaveBeenCalledWith({ testField: 'someValue' }, true, {
          errors: [],
          warnings: [expect.objectContaining({ code: 'warning', path: 'testField' })],
        });
      });
    });

    it('stops waiting after the time limit when it never settles', async () => {
      jest.useFakeTimers();
      const handleSubmit = jest.fn();
      const pendingValidations = await submitWithSupersededValidation(handleSubmit);

      await act(async () => {
        pendingValidations[0](warning);
      });

      // Still waiting shortly before the limit.
      await act(() => jest.advanceTimersByTimeAsync(9000));
      expect(handleSubmit).not.toHaveBeenCalled();

      // Past the limit the form is submitted with what is known, instead of blocking forever.
      await act(() => jest.advanceTimersByTimeAsync(2000));
      expect(handleSubmit).toHaveBeenCalledWith({ testField: 'someValue' }, true, {
        errors: [],
        warnings: [],
      });
    });
  });

  describe('w/ errors and warnings', () => {
    it('passes validation errors and warnings to submit handler', async () => {
      const handleSubmit = jest.fn();

      render(<TestForm warningValidationCodes={['warning']} onSubmit={handleSubmit} />);
      await typeText('error warning');

      await submitForm();

      await waitFor(() => {
        expect(handleSubmit).toHaveBeenCalledWith({}, false, {
          errors: [
            expect.objectContaining({
              code: 'error',
              message: 'Validation error',
              path: 'testField',
            }),
          ],
          warnings: [],
        });
      });
    });
  });
});

interface TestFormProps {
  onSubmit?: FormWithWarningsSubmitHandler;
  warningValidationCodes: string[];
  asyncValidator?: () => Promise<ValidationError | undefined>;
}

function TestForm({
  onSubmit,
  warningValidationCodes,
  asyncValidator,
}: TestFormProps): JSX.Element {
  const { form } = useFormWithWarnings({
    onSubmit,
    options: {
      warningValidationCodes,
    },
  });
  const textFieldConfig: FieldConfig<string> = {
    validations: [
      ...(asyncValidator ? [{ validator: asyncValidator, isAsync: true }] : []),
      {
        validator: (data) => {
          if (data.value.includes('error')) {
            return {
              code: 'error',
              message: 'Validation error',
            };
          }

          if (data.value.includes('warning')) {
            return {
              code: 'warning',
              message: 'Validation warning',
            };
          }
        },
      },
    ],
  };

  return (
    <Form form={form}>
      <div>
        {'isValid:'} {JSON.stringify(form.isValid ?? 'undefined')}
      </div>
      <div>
        {'isSubmitting:'} {JSON.stringify(form.isSubmitting)}
      </div>
      <div>
        {'isSubmitted:'} {JSON.stringify(form.isSubmitted)}
      </div>
      <UseField path="testField" component={TextField} config={textFieldConfig} />
      <button type="button" onClick={form.submit}>
        {'Submit'}
      </button>
    </Form>
  );
}

function submitForm(): Promise<void> {
  return act(async () => {
    fireEvent.click(screen.getByText('Submit'));
  });
}

async function typeText(value: string): Promise<void> {
  await act(() => {
    fireEvent.input(screen.getByRole('textbox'), {
      target: { value },
    });
  });
}
