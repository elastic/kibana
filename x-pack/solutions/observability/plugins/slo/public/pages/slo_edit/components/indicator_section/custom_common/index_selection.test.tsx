/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, screen, waitFor } from '@testing-library/react';
import type { UseFormReturn } from 'react-hook-form';
import { FormProvider, useForm } from 'react-hook-form';
import { render } from '../../../../../utils/test_helper';
import { CUSTOM_KQL_DEFAULT_VALUES, SLO_EDIT_FORM_DEFAULT_VALUES } from '../../../constants';
import type { CreateSLOForm } from '../../../types';
import { DATA_VIEW_FIELD, IndexSelection } from './index_selection';

const mockUseFetchDataViews = jest.fn();
jest.mock('@kbn/observability-plugin/public', () => ({
  ...jest.requireActual('@kbn/observability-plugin/public'),
  useFetchDataViews: () => mockUseFetchDataViews(),
}));
// The real picker needs the data views service; the stub exposes the trigger state under test.
jest.mock('@kbn/unified-search-plugin/public', () => ({
  DataViewPicker: ({ trigger }: { trigger: { color: string; 'data-test-subj': string } }) => (
    <button data-test-subj={trigger['data-test-subj']} data-color={trigger.color} />
  ),
}));

const renderIndexSelection = (): UseFormReturn<CreateSLOForm> => {
  let methods!: UseFormReturn<CreateSLOForm>;

  function Wrapper() {
    methods = useForm<CreateSLOForm>({
      defaultValues: {
        ...SLO_EDIT_FORM_DEFAULT_VALUES,
        indicator: {
          ...CUSTOM_KQL_DEFAULT_VALUES,
          params: { ...CUSTOM_KQL_DEFAULT_VALUES.params, index: 'some-index' },
        },
      },
      mode: 'all',
    });
    return (
      <FormProvider {...methods}>
        <IndexSelection />
      </FormProvider>
    );
  }

  render(<Wrapper />);
  return methods;
};

describe('<IndexSelection />', () => {
  it('clears the data view required error once the data view id is resolved from the index pattern', async () => {
    mockUseFetchDataViews.mockReturnValue({
      isLoading: true,
      data: [],
      refetch: jest.fn(),
    });

    const form = renderIndexSelection();

    mockUseFetchDataViews.mockReturnValue({
      isLoading: false,
      data: [{ id: 'dv-id', title: 'some-index', name: 'dv' }],
      refetch: jest.fn(),
    });
    await act(async () => {
      await form.trigger();
    });

    await waitFor(() => {
      expect(form.getValues(DATA_VIEW_FIELD)).toBe('dv-id');
      expect(screen.getByTestId('indexSelection')).toHaveAttribute('data-color', 'primary');
    });
  });
});
