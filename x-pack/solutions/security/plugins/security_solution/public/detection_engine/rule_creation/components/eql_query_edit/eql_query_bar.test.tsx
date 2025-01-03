/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { render, screen, fireEvent, within } from '@testing-library/react';
import type { SecuritySolutionDataViewBase } from '../../../../common/types';
import { mockIndexPattern, TestProviders, useFormFieldMock } from '../../../../common/mock';
import { mockQueryBar } from '../../../rule_management_ui/components/rules_table/__mocks__/mock';
import { selectEuiComboBoxOption } from '../../../../common/test/eui/combobox';
import type { EqlQueryBarProps } from './eql_query_bar';
import { EqlQueryBar } from './eql_query_bar';
import { getEqlValidationError } from './validators.mock';

jest.mock('../../../../common/lib/kibana');

describe('EqlQueryBar', () => {
  let mockField: EqlQueryBarProps['field'];

  beforeEach(() => {
    mockField = useFormFieldMock({
      value: mockQueryBar,
    });
  });

  it('should render correctly', () => {
    const wrapper = shallow(
      <EqlQueryBar
        dataTestSubj="myQueryBar"
        field={mockField}
        isLoading={false}
        indexPattern={mockIndexPattern}
      />
    );

    expect(wrapper.find('[data-test-subj="myQueryBar"]')).toHaveLength(1);
  });

  it('renders correctly filter bar', () => {
    const wrapper = shallow(
      <EqlQueryBar
        dataTestSubj="myQueryBar"
        field={mockField}
        isLoading={false}
        indexPattern={mockIndexPattern}
        showFilterBar={true}
      />
    );

    expect(wrapper.find('[data-test-subj="unifiedQueryInput"]').exists()).toBeFalsy();
    expect(wrapper.find('[data-test-subj="eqlFilterBar"]')).toHaveLength(1);
  });

  it('should set the field value on input change', () => {
    render(
      <TestProviders>
        <EqlQueryBar
          dataTestSubj="myQueryBar"
          field={mockField}
          isLoading={false}
          indexPattern={mockIndexPattern}
        />
      </TestProviders>
    );
    const inputElement = screen.getByTestId('eqlQueryBarTextInput');
    fireEvent.change(inputElement, { target: { value: 'newQuery' } });

    const expected = {
      filters: mockQueryBar.filters,
      query: {
        query: 'newQuery',
        language: 'eql',
      },
      saved_id: null,
    };

    expect(mockField.setValue).toHaveBeenCalledWith(expected);
  });

  it('should not render errors for a valid query', () => {
    const { queryByTestId } = render(
      <TestProviders>
        <EqlQueryBar
          dataTestSubj="myQueryBar"
          field={mockField}
          isLoading={false}
          indexPattern={mockIndexPattern}
        />
      </TestProviders>
    );

    expect(queryByTestId('eql-validation-errors-popover')).not.toBeInTheDocument();
  });

  it('should render errors for an invalid query', () => {
    const invalidMockField = useFormFieldMock({
      value: mockQueryBar,
      errors: [getEqlValidationError()],
    });
    const { getByTestId } = render(
      <TestProviders>
        <EqlQueryBar
          dataTestSubj="myQueryBar"
          field={invalidMockField}
          isLoading={false}
          indexPattern={mockIndexPattern}
        />
      </TestProviders>
    );

    expect(getByTestId('eql-validation-errors-popover')).toBeInTheDocument();
  });

  describe('EQL options interaction', () => {
    const mockIndexPatternWithEqlOptionsFields: SecuritySolutionDataViewBase = {
      fields: [
        {
          name: 'category',
          searchable: true,
          type: 'keyword',
          esTypes: ['keyword'],
          aggregatable: true,
        },
        {
          name: 'timestamp',
          searchable: true,
          type: 'date',
          aggregatable: true,
        },
        {
          name: 'tiebreaker',
          searchable: true,
          type: 'string',
          aggregatable: true,
        },
      ],
      title: 'test-*',
    };

    it('updates EQL options', async () => {
      let eqlOptions = {};

      const mockEqlOptionsField = useFormFieldMock({
        value: {},
        setValue: (updater) => {
          if (typeof updater === 'function') {
            eqlOptions = updater(eqlOptions);
          }
        },
      });

      const { getByTestId } = render(
        <TestProviders>
          <EqlQueryBar
            dataTestSubj="myQueryBar"
            field={mockField}
            eqlOptionsField={mockEqlOptionsField}
            isLoading={false}
            indexPattern={mockIndexPatternWithEqlOptionsFields}
          />
        </TestProviders>
      );

      // open options popover
      fireEvent.click(getByTestId('eql-settings-trigger'));

      await selectEuiComboBoxOption({
        comboBoxToggleButton: within(getByTestId('eql-event-category-field')).getByRole('combobox'),
        optionText: 'category',
      });

      expect(eqlOptions).toEqual({ eventCategoryField: 'category' });

      await selectEuiComboBoxOption({
        comboBoxToggleButton: within(getByTestId('eql-tiebreaker-field')).getByRole('combobox'),
        optionText: 'tiebreaker',
      });

      expect(eqlOptions).toEqual({ eventCategoryField: 'category', tiebreakerField: 'tiebreaker' });

      await selectEuiComboBoxOption({
        comboBoxToggleButton: within(getByTestId('eql-timestamp-field')).getByRole('combobox'),
        optionText: 'timestamp',
      });

      expect(eqlOptions).toEqual({
        eventCategoryField: 'category',
        tiebreakerField: 'tiebreaker',
        timestampField: 'timestamp',
      });
    });
  });
});
