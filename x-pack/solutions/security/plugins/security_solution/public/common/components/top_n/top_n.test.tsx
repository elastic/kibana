/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactWrapper } from 'enzyme';
import { mount } from 'enzyme';
import React from 'react';
import { screen, render, waitFor, fireEvent } from '@testing-library/react';

import { TestProviders, mockDataViewSpec } from '../../mock';

import { allEvents, defaultOptions } from './helpers';
import type { Props as TopNProps } from './top_n';
import { TopN } from './top_n';
import { InputsModelId } from '../../store/inputs/constants';

jest.mock('../visualization_actions/visualization_embeddable');

jest.mock('react-router-dom', () => {
  const original = jest.requireActual('react-router-dom');

  return {
    ...original,
    useLocation: jest.fn().mockReturnValue({ pathname: '' }),
    useHistory: () => ({
      useHistory: jest.fn(),
    }),
  };
});

jest.mock('../../lib/kibana');
jest.mock('../link_to');
jest.mock('../visualization_actions/actions');

jest.mock('uuid', () => {
  return {
    v1: jest.fn(() => 'uuidv1()'),
    v4: jest.fn(() => 'uuidv4()'),
  };
});

const field = 'host.name';
const filterQuery = {
  bool: {
    must: [],
    filter: [
      {
        bool: {
          filter: [
            {
              bool: {
                filter: [
                  {
                    bool: {
                      should: [{ match_phrase: { 'network.transport': 'tcp' } }],
                      minimum_should_match: 1,
                    },
                  },
                  {
                    bool: { should: [{ exists: { field: 'host.name' } }], minimum_should_match: 1 },
                  },
                ],
              },
            },
            {
              bool: {
                filter: [
                  {
                    bool: {
                      should: [{ range: { '@timestamp': { gte: 1586824450493 } } }],
                      minimum_should_match: 1,
                    },
                  },
                  {
                    bool: {
                      should: [{ range: { '@timestamp': { lte: 1586910850493 } } }],
                      minimum_should_match: 1,
                    },
                  },
                ],
              },
            },
          ],
        },
      },
      { match_phrase: { 'source.port': { query: '30045' } } },
    ],
    should: [],
    must_not: [],
  },
};

describe('TopN', () => {
  const query = { query: '', language: 'kuery' };

  const toggleTopN = jest.fn();
  const eventTypes: { [id: string]: TopNProps['defaultView'] } = {
    raw: 'raw',
    alert: 'alert',
    all: 'all',
  };
  let testProps: TopNProps = {
    defaultView: eventTypes.raw,
    field,
    filters: [],
    from: '2020-04-14T00:31:47.695Z',
    indexPattern: mockDataViewSpec,
    options: defaultOptions,
    query,
    setAbsoluteRangeDatePickerTarget: InputsModelId.global,
    setQuery: jest.fn(),
    to: '2020-04-15T00:31:47.695Z',
    toggleTopN,
  };
  describe('common functionality', () => {
    beforeEach(() => {
      render(
        <TestProviders>
          <TopN {...testProps} />
        </TestProviders>
      );
    });

    test('it invokes the toggleTopN function when the close button is clicked', () => {
      fireEvent.click(screen.getByTestId('close'));

      expect(toggleTopN).toHaveBeenCalled();
    });
  });

  describe('events view', () => {
    let wrapper: ReactWrapper;

    beforeEach(() => {
      wrapper = mount(
        <TestProviders>
          <TopN {...testProps} />
        </TestProviders>
      );
    });

    test(`it renders EventsByDataset when defaultView is 'raw'`, () => {
      expect(wrapper.find('[data-test-subj="eventsByDatasetOverview-topNPanel"]').exists()).toBe(
        true
      );
    });

    test(`it does NOT render SignalsByCategory when defaultView is 'raw'`, () => {
      expect(wrapper.find('[data-test-subj="alerts-histogram-panel"]').exists()).toBe(false);
    });
  });

  describe('alerts view', () => {
    beforeAll(() => {
      testProps = {
        ...testProps,
        defaultView: eventTypes.alert,
      };
    });

    test(`it renders SignalsByCategory when defaultView is 'alert'`, async () => {
      const wrapper = mount(
        <TestProviders>
          <TopN {...testProps} />
        </TestProviders>
      );
      await waitFor(() => {
        expect(wrapper.find('[data-test-subj="alerts-histogram-panel"]').exists()).toBe(true);
      });
    });

    test(`it does NOT render EventsByDataset when defaultView is 'alert'`, async () => {
      const wrapper = mount(
        <TestProviders>
          <TopN {...testProps} />
        </TestProviders>
      );
      await waitFor(() => {
        expect(wrapper.find('[data-test-subj="eventsByDatasetOverview-topNPanel"]').exists()).toBe(
          false
        );
      });
    });
  });

  describe('All events, a view shown only when rendered in the context of the active timeline', () => {
    let wrapper: ReactWrapper;

    beforeEach(() => {
      testProps = {
        ...testProps,
        defaultView: eventTypes.all,
        options: allEvents,
      };
      wrapper = mount(
        <TestProviders>
          <TopN {...testProps} filterQuery={JSON.stringify(filterQuery)} />
        </TestProviders>
      );
    });

    test(`it renders EventsByDataset when defaultView is 'all'`, () => {
      expect(wrapper.find('[data-test-subj="eventsByDatasetOverview-topNPanel"]').exists()).toBe(
        true
      );
    });

    test(`it does NOT render SignalsByCategory when defaultView is 'all'`, () => {
      expect(wrapper.find('[data-test-subj="alerts-histogram-panel"]').exists()).toBe(false);
    });
  });
});
