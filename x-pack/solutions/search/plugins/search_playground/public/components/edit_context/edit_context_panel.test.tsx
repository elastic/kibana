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
        source_fields: ['title', 'description'],
        semantic_fields: [],
      },
      index2: {
        elser_query_fields: [],
        dense_vector_query_fields: [],
        bm25_query_fields: ['foo', 'bar'],
        source_fields: ['body'],
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
        index1: ['title'],
        index2: ['body'],
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
    expect(screen.getByTestId('contextFieldsSelectable-index1')).toBeInTheDocument();
    const listButton = screen
      .getByTestId('contextFieldsSelectable-index1')
      .querySelector('[data-test-subj="comboBoxToggleListButton"]');
    expect(listButton).not.toBeNull();
    fireEvent.click(listButton!);

    for (const field of ['title', 'description']) {
      expect(screen.getByTestId(`contextField-${field}`)).toBeInTheDocument();
    }
  });
});
