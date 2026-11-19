/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount, render } from 'enzyme';
import { FieldValueSelection } from './field_value_selection';
import { EuiSelectable, EuiSelectableList, EuiThemeProvider } from '@elastic/eui';

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

  it('does not show a count for selected values that have no suggestion', () => {
    const wrapper = mount(
      <EuiThemeProvider>
        <FieldValueSelection
          label="Tags"
          values={[{ label: 'b', count: 1 }]}
          onChange={() => {}}
          selectedValue={['a']}
          loading={false}
          setQuery={() => {}}
        />
      </EuiThemeProvider>
    );

    wrapper.find('button[data-test-subj="fieldValueSelectionBtn"]').simulate('click');

    const visibleOptions = (wrapper.find(EuiSelectableList).props() as any)
      .visibleOptions as Array<{ label: string; append: unknown }>;

    expect(visibleOptions.find(({ label }) => label === 'a')?.append).toBeNull();
    expect(visibleOptions.find(({ label }) => label === 'b')?.append).not.toBeNull();
  });

  describe('when suggestions change while the popover is open', () => {
    const renderWithValues = (suggestions: Array<{ label: string; count: number }>) => (
      <FieldValueSelection
        label="Tags"
        values={suggestions}
        onChange={() => {}}
        selectedValue={[]}
        loading={false}
        setQuery={() => {}}
      />
    );

    const getVisibleOptions = (wrapper: ReturnType<typeof mount>) =>
      (
        (wrapper.find(EuiSelectableList).props() as any).visibleOptions as Array<{
          label: string;
          checked?: string;
        }>
      ).map(({ label, checked }) => ({ label, checked }));

    it('shows the new suggestions and keeps the checks made so far', () => {
      const wrapper = mount(
        <EuiThemeProvider>
          {renderWithValues([
            { label: 'a', count: 1 },
            { label: 'b', count: 1 },
          ])}
        </EuiThemeProvider>
      );

      wrapper.find('button[data-test-subj="fieldValueSelectionBtn"]').simulate('click');
      wrapper.find('li[role="option"]').first().simulate('click');

      wrapper.setProps({
        children: renderWithValues([
          { label: 'a', count: 1 },
          { label: 'b', count: 1 },
          { label: 'c', count: 3 },
        ]),
      });
      wrapper.update();

      expect(getVisibleOptions(wrapper)).toEqual([
        { label: 'a', checked: 'on' },
        { label: 'b', checked: undefined },
        { label: 'c', checked: undefined },
      ]);
    });

    it('keeps the same options when only the counts change', () => {
      const wrapper = mount(
        <EuiThemeProvider>
          {renderWithValues([
            { label: 'a', count: 1 },
            { label: 'b', count: 1 },
          ])}
        </EuiThemeProvider>
      );

      wrapper.find('button[data-test-subj="fieldValueSelectionBtn"]').simulate('click');
      const optionsBefore = wrapper.find(EuiSelectable).props().options;

      wrapper.setProps({
        children: renderWithValues([
          { label: 'a', count: 5 },
          { label: 'b', count: 7 },
        ]),
      });
      wrapper.update();

      expect(wrapper.find(EuiSelectable).props().options).toBe(optionsBefore);
    });

    it('keeps a checked option that the new suggestions omit', () => {
      const wrapper = mount(
        <EuiThemeProvider>
          {renderWithValues([
            { label: 'a', count: 1 },
            { label: 'b', count: 1 },
          ])}
        </EuiThemeProvider>
      );

      wrapper.find('button[data-test-subj="fieldValueSelectionBtn"]').simulate('click');
      wrapper.find('li[role="option"]').first().simulate('click');

      wrapper.setProps({ children: renderWithValues([{ label: 'b', count: 1 }]) });
      wrapper.update();

      expect(getVisibleOptions(wrapper)).toEqual([
        { label: 'a', checked: 'on' },
        { label: 'b', checked: undefined },
      ]);
    });
  });

  it('checks newly applied selections that arrive while the popover is open', () => {
    const renderSelection = (selectedValue: string[]) => (
      <FieldValueSelection
        label="Tags"
        values={[
          { label: 'a', count: 1 },
          { label: 'b', count: 1 },
        ]}
        onChange={() => {}}
        selectedValue={selectedValue}
        loading={false}
        setQuery={() => {}}
      />
    );
    const wrapper = mount(<EuiThemeProvider>{renderSelection([])}</EuiThemeProvider>);

    wrapper.find('button[data-test-subj="fieldValueSelectionBtn"]').simulate('click');
    wrapper.setProps({ children: renderSelection(['a', 'b']) });
    wrapper.update();

    const visibleOptions = (wrapper.find(EuiSelectableList).props() as any)
      .visibleOptions as Array<{
      label: string;
      checked?: string;
    }>;

    expect(visibleOptions.map(({ label, checked }) => ({ label, checked }))).toEqual([
      { label: 'a', checked: 'on' },
      { label: 'b', checked: 'on' },
    ]);
  });
});
