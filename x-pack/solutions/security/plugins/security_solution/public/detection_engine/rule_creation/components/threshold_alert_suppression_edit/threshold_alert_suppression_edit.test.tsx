/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { screen, render } from '@testing-library/react';
import { Form, useForm } from '../../../../shared_imports';
import { ThresholdAlertSuppressionEdit } from './threshold_alert_suppression_edit';

describe('ThresholdAlertSuppressionEdit', () => {
  it('renders labelAppend content when provided', () => {
    render(<TestForm labelAppend={<span data-test-subj="optionalBadge">{'Optional'}</span>} />);

    expect(screen.getByTestId('optionalBadge')).toBeInTheDocument();
  });

  it('does not render labelAppend content when omitted', () => {
    render(<TestForm />);

    expect(screen.queryByTestId('optionalBadge')).not.toBeInTheDocument();
  });
});

interface TestFormProps {
  labelAppend?: React.ReactNode;
}

function TestForm({ labelAppend }: TestFormProps): JSX.Element {
  const { form } = useForm();

  return (
    <I18nProvider>
      <Form form={form}>
        <ThresholdAlertSuppressionEdit
          suppressionFieldNames={undefined}
          labelAppend={labelAppend}
        />
      </Form>
    </I18nProvider>
  );
}
