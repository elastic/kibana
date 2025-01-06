/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { EditContextPanel } from './edit_context_panel';
import { FormProvider, useForm } from 'react-hook-form';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { ChatFormFields } from '../../types';

jest.mock('../../hooks/use_source_indices_field', () => ({
  useSourceIndicesFields: () => ({
    fields: {
      index1: {
        elser_query_fields: [],
        dense_vector_query_fields: [],
        bm25_query_fields: ['field1', 'field2'],
        source_fields: ['context_field1', 'context_field2'],
        semantic_fields: [],
      },
      index2: {
        elser_query_fields: [],
        dense_vector_query_fields: [],
        bm25_query_fields: ['field1', 'field2'],
        source_fields: ['context_field1', 'context_field2'],
        semantic_fields: [],
      },
    },
  }),
}));

jest.mock('../../hooks/use_usage_tracker', () => ({
  useUsageTracker: () => ({
    count: jest.fn(),
    load: jest.fn(),
    click: jest.fn(),
  }),
}));

const MockFormProvider = ({ children }: { children: React.ReactElement }) => {
  const methods = useForm({
    values: {
      [ChatFormFields.indices]: ['index1'],
      [ChatFormFields.docSize]: 1,
      [ChatFormFields.sourceFields]: {
        index1: ['context_field1'],
        index2: ['context_field2'],
      },
    },
  });
  return <FormProvider {...methods}>{children}</FormProvider>;
};

describe('EditContextFlyout component tests', () => {
  beforeEach(() => {
    render(
      <IntlProvider locale="en">
        <MockFormProvider>
          <EditContextPanel />
        </MockFormProvider>
      </IntlProvider>
    );
  });

  it('should see the context fields', async () => {
    expect(screen.getByTestId('contextFieldsSelectable-0')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('contextFieldsSelectable-0'));
    const fields = await screen.findAllByTestId('contextField');
    expect(fields.length).toBe(2);
  });
});
