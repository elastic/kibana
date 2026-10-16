/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount, render } from 'enzyme';
import { FieldValueSelection } from './field_value_selection';
import { EuiSelectableList, EuiThemeProvider } from '@elastic/eui';

const values = [
  { label: 'elastic co frontend', count: 1 },
  { label: 'apm server', count: 2 },
];

describe('FieldValueSelection', () => {
  it('renders a label for button', async () => {
    const wrapper = render(
      <FieldValueSelection
        label="Service name"
        values={values}
        onChange={() => {}}
        selectedValue={[]}
        loading={false}
        setQuery={() => {}}
      />
    );

    const btn = wrapper.find('[data-test-subj=fieldValueSelectionBtn]');

    expect(btn.text()).toBe('Service name');
  });

  it('renders a list on click', async () => {
    const wrapper = mount(
      <EuiThemeProvider>
        <FieldValueSelection
          label="Service name"
          values={values}
          onChange={() => {}}
          selectedValue={[]}
          loading={false}
          setQuery={() => {}}
        />
      </EuiThemeProvider>
    );

    const btn = wrapper.find('button[data-test-subj="fieldValueSelectionBtn"]');
    btn.simulate('click');

    const list = wrapper.find(EuiSelectableList);

    expect((list.props() as any).visibleOptions).toMatchInlineSnapshot(`
      Array [
        Object {
          "append": <Counter>
            <EuiText
              size="xs"
            >
              1
            </EuiText>
          </Counter>,
          "label": "elastic co frontend",
        },
        Object {
          "append": <Counter>
            <EuiText
              size="xs"
            >
              2
            </EuiText>
          </Counter>,
          "label": "apm server",
        },
      ]
    `);
  });

  it('keeps selected values that are missing from the current suggestion list', () => {
    const wrapper = mount(
      <EuiThemeProvider>
        <FieldValueSelection
          label="Tags"
          values={[{ label: 'b', count: 1 }]}
          onChange={() => {}}
          selectedValue={['a', 'b']}
          loading={false}
          setQuery={() => {}}
        />
      </EuiThemeProvider>
    );

    wrapper.find('button[data-test-subj="fieldValueSelectionBtn"]').simulate('click');

    const visibleOptions = (wrapper.find(EuiSelectableList).props() as any)
      .visibleOptions as Array<{
      label: string;
      checked?: string;
    }>;

    expect(visibleOptions.map(({ label, checked }) => ({ label, checked }))).toEqual([
      { label: 'b', checked: 'on' },
      { label: 'a', checked: 'on' },
    ]);
  });
});
