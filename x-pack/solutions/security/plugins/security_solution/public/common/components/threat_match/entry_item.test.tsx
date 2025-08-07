/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mount } from 'enzyme';
import { render, screen, within } from '@testing-library/react';
import React from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiComboBox } from '@elastic/eui';
import userEvent from '@testing-library/user-event';

import { EntryItem } from './entry_item';
import { fields, getField } from '@kbn/data-plugin/common/mocks';
import type { DataViewBase } from '@kbn/es-query';

jest.mock('../../lib/kibana');
jest.mock('../../hooks/use_experimental_features', () => ({
  useIsExperimentalFeatureEnabled: jest.fn().mockReturnValue(true),
}));

describe('EntryItem', () => {
  test('it renders field labels if "showLabel" is "true"', () => {
    const wrapper = mount(
      <EntryItem
        entry={{
          id: '123',
          field: undefined,
          value: undefined,
          type: 'mapping',
          entryIndex: 0,
        }}
        indexPattern={
          {
            id: '1234',
            title: 'logstash-*',
            fields,
          } as DataViewBase
        }
        showLabel={true}
        onChange={jest.fn()}
        threatIndexPatterns={
          {
            id: '1234',
            title: 'logstash-*',
            fields,
          } as DataViewBase
        }
      />
    );

    expect(wrapper.find('[data-test-subj="threatFieldInputFormRow"]')).not.toEqual(0);
  });

  test('it invokes "onChange" when new field is selected and resets value fields', () => {
    const mockOnChange = jest.fn();
    const wrapper = mount(
      <EntryItem
        entry={{
          id: '123',
          field: getField('ip'),
          type: 'mapping',
          value: getField('ip'),
          entryIndex: 0,
        }}
        indexPattern={
          {
            id: '1234',
            title: 'logstash-*',
            fields,
          } as DataViewBase
        }
        threatIndexPatterns={
          {
            id: '1234',
            title: 'logstash-*',
            fields,
          } as DataViewBase
        }
        showLabel={false}
        onChange={mockOnChange}
      />
    );

    (
      wrapper.find(EuiComboBox).at(0).props() as unknown as {
        onChange: (a: EuiComboBoxOptionOption[]) => void;
      }
    ).onChange([{ label: 'machine.os' }]);

    expect(mockOnChange).toHaveBeenCalledWith(
      {
        id: '123',
        field: 'machine.os',
        type: 'mapping',
        value: 'ip',
        negate: false,
      },
      0
    );
  });

  test('it invokes "onChange" when new value is selected', () => {
    const mockOnChange = jest.fn();
    const wrapper = mount(
      <EntryItem
        entry={{
          id: '123',
          field: getField('ip'),
          type: 'mapping',
          value: getField('ip'),
          entryIndex: 0,
        }}
        indexPattern={
          {
            id: '1234',
            title: 'logstash-*',
            fields,
          } as DataViewBase
        }
        threatIndexPatterns={
          {
            id: '1234',
            title: 'logstash-*',
            fields,
          } as DataViewBase
        }
        showLabel={false}
        onChange={mockOnChange}
      />
    );

    (
      wrapper.find(EuiComboBox).at(1).props() as unknown as {
        onChange: (a: EuiComboBoxOptionOption[]) => void;
      }
    ).onChange([{ label: 'is not' }]);

    expect(mockOnChange).toHaveBeenCalledWith(
      { id: '123', field: 'ip', type: 'mapping', value: '', negate: false },
      0
    );
  });

  test('displays field values and MATCHES select', async () => {
    const mockOnChange = jest.fn();

    render(
      <EntryItem
        entry={{
          id: '123',
          field: getField('ip'),
          type: 'mapping',
          value: getField('ip'),
          entryIndex: 1,
        }}
        indexPattern={
          {
            id: '1234',
            title: 'logstash-*',
            fields,
          } as DataViewBase
        }
        threatIndexPatterns={
          {
            id: '1234',
            title: 'logstash-*',
            fields,
          } as DataViewBase
        }
        showLabel={false}
        onChange={mockOnChange}
      />
    );

    const matchSelect = within(screen.getByTestId('entryItemMatchInputFormRow')).getByRole(
      'button'
    );

    const comboboxes = screen.getAllByRole('combobox');

    expect(comboboxes).toHaveLength(2);
    expect(comboboxes[0]).toHaveValue('ip');
    expect(comboboxes[1]).toHaveValue('ip');
    expect(matchSelect).toHaveTextContent('MATCHES');
  });

  test('displays field values and DOES NOT MATCH select', async () => {
    const mockOnChange = jest.fn();

    render(
      <EntryItem
        entry={{
          id: '123',
          field: getField('ip'),
          type: 'mapping',
          value: getField('ip'),
          entryIndex: 1,
          negate: true,
        }}
        indexPattern={
          {
            id: '1234',
            title: 'logstash-*',
            fields,
          } as DataViewBase
        }
        threatIndexPatterns={
          {
            id: '1234',
            title: 'logstash-*',
            fields,
          } as DataViewBase
        }
        showLabel={false}
        onChange={mockOnChange}
      />
    );

    const matchSelect = within(screen.getByTestId('entryItemMatchInputFormRow')).getByRole(
      'button'
    );

    expect(matchSelect).toHaveTextContent('DOES NOT MATCH');
  });

  test('displays DOES NOT MATCH select option as disabled if doesNotMatchDisabled=true', async () => {
    const mockOnChange = jest.fn();

    render(
      <EntryItem
        doesNotMatchDisabled
        entry={{
          id: '123',
          field: getField('ip'),
          type: 'mapping',
          value: getField('ip'),
          entryIndex: 0,
          negate: true,
        }}
        indexPattern={
          {
            id: '1234',
            title: 'logstash-*',
            fields,
          } as DataViewBase
        }
        threatIndexPatterns={
          {
            id: '1234',
            title: 'logstash-*',
            fields,
          } as DataViewBase
        }
        showLabel={false}
        onChange={mockOnChange}
      />
    );

    const matchSelect = within(screen.getByTestId('entryItemMatchInputFormRow')).getByRole(
      'button'
    );

    await userEvent.click(matchSelect);
    const option = screen.getByRole('option', { name: 'DOES NOT MATCH' });

    expect(option).toBeDisabled();
  });

  test('invokes onChange when MATCHES clause changed to DOES NOT MATCH', async () => {
    const mockOnChange = jest.fn();

    render(
      <EntryItem
        entry={{
          id: '123',
          field: getField('ip'),
          type: 'mapping',
          value: getField('ip'),
          entryIndex: 1,
          negate: false,
        }}
        indexPattern={
          {
            id: '1234',
            title: 'logstash-*',
            fields,
          } as DataViewBase
        }
        threatIndexPatterns={
          {
            id: '1234',
            title: 'logstash-*',
            fields,
          } as DataViewBase
        }
        showLabel={false}
        onChange={mockOnChange}
      />
    );

    const matchSelect = within(screen.getByTestId('entryItemMatchInputFormRow')).getByRole(
      'button'
    );

    await userEvent.click(matchSelect);
    const option = screen.getByRole('option', { name: 'DOES NOT MATCH' });

    await userEvent.click(option);

    expect(mockOnChange).toHaveBeenCalledWith(
      { id: '123', field: 'ip', type: 'mapping', value: 'ip', negate: true },
      1
    );
  });
});
