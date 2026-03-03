/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { Form, useForm } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { EsqlEditor } from './esql_editor';
import { schema } from '../../schema';

describe('EsqlEditor', () => {
  const Component = () => {
    const { form } = useForm({
      defaultValue: {
        ruleName: 'test rule',
        queryBar: {
          query: {
            query: ' test query',
            language: 'esql',
          },
        },
      },
      schema,
    });
    return (
      <Form form={form}>
        <EsqlEditor path="queryBar" />
      </Form>
    );
  };

  it('renders the EsqlEditorField', () => {
    const { getByTestId } = render(<Component />);
    expect(getByTestId('ruleEsqlQueryBar')).toBeInTheDocument();
  });
});
