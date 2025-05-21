/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ThemeProvider } from 'styled-components';
import { mount } from 'enzyme';
import { render, screen } from '@testing-library/react';

import { fields } from '@kbn/data-plugin/common/mocks';

import { useKibana } from '../../lib/kibana';

import { ThreatMatchComponent } from '.';
import type { ThreatMapEntries } from './types';
import type { DataViewBase } from '@kbn/es-query';
import { getMockTheme } from '../../lib/kibana/kibana_react.mock';
import { createOrNewEntryItem } from './helpers';

const mockTheme = getMockTheme({
  eui: {
    euiColorLightShade: '#ece',
  },
});

jest.mock('../../lib/kibana');

const getDoublePayLoad = (): ThreatMapEntries[] => [
  { entries: [{ field: 'host.name', type: 'mapping', value: 'host.name' }] },
  { entries: [{ field: 'host.name', type: 'mapping', value: 'host.name' }] },
];

describe('ThreatMatchComponent', () => {
  const getValueSuggestionsMock = jest.fn().mockResolvedValue(['value 1', 'value 2']);

  beforeEach(() => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        unifiedSearch: {
          autocomplete: {
            getValueSuggestions: getValueSuggestionsMock,
          },
        },
      },
    });
  });

  afterEach(() => {
    getValueSuggestionsMock.mockClear();
  });

  test('it displays empty entry if no "listItems" are passed in', () => {
    const wrapper = mount(
      <ThemeProvider theme={mockTheme}>
        <ThreatMatchComponent
          mappingEntries={[createOrNewEntryItem()]}
          indexPatterns={
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
          onMappingEntriesChange={jest.fn()}
        />
      </ThemeProvider>
    );

    expect(wrapper.find('EuiFlexGroup[data-test-subj="itemEntryContainer"]')).toHaveLength(1);
    expect(wrapper.find('[data-test-subj="entryField"] input').props().placeholder).toEqual(
      'Search'
    );
    expect(wrapper.find('[data-test-subj="threatEntryField"] input').props().placeholder).toEqual(
      'Search'
    );
  });

  test('it displays field values for "listItems" that are passed in', async () => {
    const mapping: ThreatMapEntries[] = [
      { entries: [{ field: 'host.name', type: 'mapping', value: 'host.name' }] },
    ];

    render(
      <ThreatMatchComponent
        mappingEntries={mapping}
        indexPatterns={
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
        onMappingEntriesChange={jest.fn()}
      />
    );

    expect(screen.getAllByTestId('itemEntryContainer')).toHaveLength(1);

    const comboboxes = screen.getAllByRole('combobox');

    expect(comboboxes).toHaveLength(2);
    expect(comboboxes[0]).toHaveValue('host.name');
    expect(comboboxes[1]).toHaveValue('host.name');
  });

  test('it displays "or", "and" enabled', () => {
    const wrapper = mount(
      <ThemeProvider theme={mockTheme}>
        <ThreatMatchComponent
          mappingEntries={[]}
          indexPatterns={
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
          onMappingEntriesChange={jest.fn()}
        />
      </ThemeProvider>
    );

    expect(wrapper.find('[data-test-subj="andButton"] button').prop('disabled')).toBeFalsy();
    expect(wrapper.find('[data-test-subj="orButton"] button').prop('disabled')).toBeFalsy();
  });

  test('it adds an entry when "and" clicked', async () => {
    const handleMappingEntriesChangeMock = jest.fn();

    const wrapper = mount(
      <ThemeProvider theme={mockTheme}>
        <ThreatMatchComponent
          mappingEntries={[createOrNewEntryItem()]}
          indexPatterns={
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
          onMappingEntriesChange={handleMappingEntriesChangeMock}
        />
      </ThemeProvider>
    );

    expect(wrapper.find('EuiFlexGroup[data-test-subj="itemEntryContainer"]')).toHaveLength(1);

    wrapper.find('[data-test-subj="andButton"] button').simulate('click');

    expect(handleMappingEntriesChangeMock).toHaveBeenCalledWith([
      expect.objectContaining({
        entries: [
          expect.objectContaining({
            field: '',
            type: 'mapping',
            value: '',
          }),
          expect.objectContaining({
            field: '',
            type: 'mapping',
            value: '',
          }),
        ],
      }),
    ]);
  });

  test('it shows two AND entries', () => {
    const mappingEntries: ThreatMapEntries[] = [
      {
        entries: [
          {
            field: '',
            type: 'mapping',
            value: '',
          },
          {
            field: '',
            type: 'mapping',
            value: '',
          },
        ],
      },
    ];

    const wrapper = mount(
      <ThemeProvider theme={mockTheme}>
        <ThreatMatchComponent
          mappingEntries={mappingEntries}
          indexPatterns={
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
          onMappingEntriesChange={jest.fn()}
        />
      </ThemeProvider>
    );

    expect(wrapper.find('EuiFlexGroup[data-test-subj="itemEntryContainer"]')).toHaveLength(2);
    expect(wrapper.find('[data-test-subj="entryField"] input').at(0).props().placeholder).toEqual(
      'Search'
    );
    expect(
      wrapper.find('[data-test-subj="threatEntryField"] input').at(0).props().placeholder
    ).toEqual('Search');
    expect(wrapper.find('[data-test-subj="entryField"] input').at(1).props().placeholder).toEqual(
      'Search'
    );
    expect(
      wrapper.find('[data-test-subj="threatEntryField"] input').at(1).props().placeholder
    ).toEqual('Search');
  });

  test('it adds an item when "or" clicked', async () => {
    const handleMappingEntriesChangeMock = jest.fn();

    const wrapper = mount(
      <ThemeProvider theme={mockTheme}>
        <ThreatMatchComponent
          mappingEntries={[createOrNewEntryItem()]}
          indexPatterns={
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
          onMappingEntriesChange={handleMappingEntriesChangeMock}
        />
      </ThemeProvider>
    );

    expect(wrapper.find('EuiFlexGroup[data-test-subj="entriesContainer"]')).toHaveLength(1);

    wrapper.find('[data-test-subj="orButton"] button').simulate('click');

    expect(handleMappingEntriesChangeMock).toHaveBeenCalledWith([
      expect.objectContaining({
        entries: [
          expect.objectContaining({
            field: '',
            type: 'mapping',
            value: '',
          }),
        ],
      }),
      expect.objectContaining({
        entries: [
          expect.objectContaining({
            field: '',
            type: 'mapping',
            value: '',
          }),
        ],
      }),
    ]);
  });

  test('it shows two OR entries', () => {
    const mappingEntries: ThreatMapEntries[] = [
      {
        entries: [
          {
            field: '',
            type: 'mapping',
            value: '',
          },
        ],
      },
      {
        entries: [
          {
            field: '',
            type: 'mapping',
            value: '',
          },
        ],
      },
    ];

    const wrapper = mount(
      <ThemeProvider theme={mockTheme}>
        <ThreatMatchComponent
          mappingEntries={mappingEntries}
          indexPatterns={
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
          onMappingEntriesChange={jest.fn()}
        />
      </ThemeProvider>
    );

    expect(wrapper.find('EuiFlexGroup[data-test-subj="entriesContainer"]')).toHaveLength(2);
    expect(wrapper.find('[data-test-subj="entryField"] input').at(0).props().placeholder).toEqual(
      'Search'
    );
    expect(
      wrapper.find('[data-test-subj="threatEntryField"] input').at(0).props().placeholder
    ).toEqual('Search');
    expect(wrapper.find('[data-test-subj="entryField"] input').at(1).props().placeholder).toEqual(
      'Search'
    );
    expect(
      wrapper.find('[data-test-subj="threatEntryField"] input').at(1).props().placeholder
    ).toEqual('Search');
  });

  test('it removes one row if user deletes a row', () => {
    const mappingEntries = getDoublePayLoad();
    const handleMappingEntriesChangeMock = jest.fn();

    const wrapper = mount(
      <ThemeProvider theme={mockTheme}>
        <ThreatMatchComponent
          mappingEntries={mappingEntries}
          indexPatterns={
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
          onMappingEntriesChange={handleMappingEntriesChangeMock}
        />
      </ThemeProvider>
    );

    expect(wrapper.find('div[data-test-subj="entriesContainer"]').length).toEqual(2);
    wrapper.find('[data-test-subj="firstRowDeleteButton"] button').simulate('click');

    expect(handleMappingEntriesChangeMock).toHaveBeenCalledWith([mappingEntries[1]]);
  });

  test('it displays "and" badge if at least one item includes more than one entry', () => {
    const mappingEntries: ThreatMapEntries[] = [
      {
        entries: [
          {
            field: '',
            type: 'mapping',
            value: '',
          },
          {
            field: '',
            type: 'mapping',
            value: '',
          },
        ],
      },
    ];

    const wrapper = mount(
      <ThemeProvider theme={mockTheme}>
        <ThreatMatchComponent
          mappingEntries={mappingEntries}
          indexPatterns={
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
          onMappingEntriesChange={jest.fn()}
        />
      </ThemeProvider>
    );

    expect(wrapper.find('[data-test-subj="entryItemEntryFirstRowAndBadge"]').exists()).toBeTruthy();
  });

  test('it does not display "and" badge if none of the items include more than one entry', () => {
    const wrapper = mount(
      <ThemeProvider theme={mockTheme}>
        <ThreatMatchComponent
          mappingEntries={[]}
          indexPatterns={
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
          onMappingEntriesChange={jest.fn()}
        />
      </ThemeProvider>
    );

    wrapper.find('[data-test-subj="orButton"] button').simulate('click');

    expect(wrapper.find('[data-test-subj="entryItemEntryFirstRowAndBadge"]').exists()).toBeFalsy();

    wrapper.find('[data-test-subj="orButton"] button').simulate('click');

    expect(wrapper.find('[data-test-subj="entryItemEntryFirstRowAndBadge"]').exists()).toBeFalsy();
  });
});
