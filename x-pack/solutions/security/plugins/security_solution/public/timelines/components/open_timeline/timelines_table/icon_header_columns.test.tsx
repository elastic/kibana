/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep, omit } from 'lodash/fp';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import React from 'react';
import { render } from '@testing-library/react';

import { mockTimelineResults } from '../../../../common/mock/timeline_results';
import type { TimelinesTableProps } from '.';
import { TimelinesTable } from '.';
import type { OpenTimelineResult } from '../types';
import { getMockTimelinesTableProps } from './mocks';
import { TestProvidersComponent } from '../../../../common/mock';
import { getSuperTimelineQueryTypeColumn } from './icon_header_columns';

jest.mock('../../../../common/lib/kibana');

describe('#getActionsColumns', () => {
  let mockResults: OpenTimelineResult[];

  beforeEach(() => {
    mockResults = cloneDeep(mockTimelineResults);
  });

  test('it renders the pinned events header icon', () => {
    const wrapper = mountWithIntl(
      <TestProvidersComponent>
        <TimelinesTable {...getMockTimelinesTableProps(mockResults)} />
      </TestProvidersComponent>
    );

    expect(wrapper.find('[data-test-subj="pinned-event-header-icon"]').exists()).toBe(true);
  });

  test('it renders the expected pinned events count', () => {
    const with6Events = [mockResults[0]];
    const testProps: TimelinesTableProps = {
      ...getMockTimelinesTableProps(with6Events),
    };
    const wrapper = mountWithIntl(
      <TestProvidersComponent>
        <TimelinesTable {...testProps} />
      </TestProvidersComponent>
    );

    expect(wrapper.find('[data-test-subj="pinned-event-count"]').text()).toEqual('6');
  });

  test('it renders the notes count header icon', () => {
    const wrapper = mountWithIntl(
      <TestProvidersComponent>
        <TimelinesTable {...getMockTimelinesTableProps(mockResults)} />
      </TestProvidersComponent>
    );

    expect(wrapper.find('[data-test-subj="notes-count-header-icon"]').exists()).toBe(true);
  });

  test('it renders the expected notes count', () => {
    const with4Notes = [mockResults[0]];
    const testProps: TimelinesTableProps = {
      ...getMockTimelinesTableProps(with4Notes),
    };
    const wrapper = mountWithIntl(
      <TestProvidersComponent>
        <TimelinesTable {...testProps} />
      </TestProvidersComponent>
    );

    expect(wrapper.find('[data-test-subj="notes-count"]').text()).toEqual('4');
  });

  test('it renders the favorites header icon', () => {
    const wrapper = mountWithIntl(
      <TestProvidersComponent>
        <TimelinesTable {...getMockTimelinesTableProps(mockResults)} />
      </TestProvidersComponent>
    );

    expect(wrapper.find('[data-test-subj="favorites-header-icon"]').exists()).toBe(true);
  });

  test('it renders an empty star when favorite is undefined', () => {
    const undefinedFavorite: OpenTimelineResult[] = [omit('favorite', { ...mockResults[0] })];
    const testProps: TimelinesTableProps = {
      ...getMockTimelinesTableProps(undefinedFavorite),
    };
    const wrapper = mountWithIntl(
      <TestProvidersComponent>
        <TimelinesTable {...testProps} />
      </TestProvidersComponent>
    );

    expect(wrapper.find('[data-test-subj="favorite-star-star"]').exists()).toBe(true);
  });

  test('it renders an empty star when favorite is null', () => {
    const nullFavorite: OpenTimelineResult[] = [{ ...mockResults[0], favorite: null }];
    const testProps: TimelinesTableProps = {
      ...getMockTimelinesTableProps(nullFavorite),
    };
    const wrapper = mountWithIntl(
      <TestProvidersComponent>
        <TimelinesTable {...testProps} />
      </TestProvidersComponent>
    );

    expect(wrapper.find('[data-test-subj="favorite-star-star"]').exists()).toBe(true);
  });

  test('it renders an empty star when favorite is empty', () => {
    const emptyFavorite: OpenTimelineResult[] = [{ ...mockResults[0], favorite: [] }];
    const testProps: TimelinesTableProps = {
      ...getMockTimelinesTableProps(emptyFavorite),
    };
    const wrapper = mountWithIntl(
      <TestProvidersComponent>
        <TimelinesTable {...testProps} />
      </TestProvidersComponent>
    );

    expect(wrapper.find('[data-test-subj="favorite-star-star"]').exists()).toBe(true);
  });

  test('it renders an filled star when favorite has one entry', () => {
    const favorite: OpenTimelineResult[] = [
      {
        ...mockResults[0],
        favorite: [
          {
            userName: 'alice',
            favoriteDate: 1553700753 * 10000,
          },
        ],
      },
    ];

    const testProps: TimelinesTableProps = {
      ...getMockTimelinesTableProps(favorite),
    };
    const wrapper = mountWithIntl(
      <TestProvidersComponent>
        <TimelinesTable {...testProps} />
      </TestProvidersComponent>
    );

    expect(wrapper.find('[data-test-subj="favorite-starFill-star"]').exists()).toBe(true);
  });

  test('it renders an filled star when favorite has more than one entry', () => {
    const favorite: OpenTimelineResult[] = [
      {
        ...mockResults[0],
        favorite: [
          {
            userName: 'alice',
            favoriteDate: 1553700753 * 10000,
          },
          {
            userName: 'bob',
            favoriteDate: 1653700754 * 10000,
          },
        ],
      },
    ];

    const testProps: TimelinesTableProps = {
      ...getMockTimelinesTableProps(favorite),
    };
    const wrapper = mountWithIntl(
      <TestProvidersComponent>
        <TimelinesTable {...testProps} />
      </TestProvidersComponent>
    );

    expect(wrapper.find('[data-test-subj="favorite-starFill-star"]').exists()).toBe(true);
  });
});

describe('getSuperTimelineQueryTypeColumn', () => {
  // Tests call the render function directly — no full component tree needed.
  const column = getSuperTimelineQueryTypeColumn();
  const renderCell = (savedSearchId: string | null | undefined, row: Partial<OpenTimelineResult>) =>
    column.render!(savedSearchId, row as OpenTimelineResult);

  it('renders the ES|QL incompatible icon when savedSearchId is set', () => {
    const node = renderCell('some-saved-search-id', { savedSearchId: 'some-saved-search-id' });
    const { container } = render(<>{node}</>);
    expect(
      container.querySelector('[data-test-subj="super-timeline-esql-incompatible-icon"]')
    ).toBeInTheDocument();
  });

  it('renders the EQL incompatible icon when queryType.hasEql is true', () => {
    const node = renderCell(null, { queryType: { hasEql: true, hasQuery: false } });
    const { container } = render(<>{node}</>);
    expect(
      container.querySelector('[data-test-subj="super-timeline-eql-incompatible-icon"]')
    ).toBeInTheDocument();
  });

  it('renders nothing for a plain KQL timeline (no savedSearchId, no EQL)', () => {
    const node = renderCell(null, { queryType: { hasEql: false, hasQuery: true } });
    expect(node).toBeNull();
  });

  it('renders nothing when queryType is undefined (defensive — list response may omit it)', () => {
    const node = renderCell(null, { queryType: undefined });
    expect(node).toBeNull();
  });

  it('ES|QL takes precedence when savedSearchId is set even if queryType.hasEql is also true', () => {
    const node = renderCell('ss-id', {
      savedSearchId: 'ss-id',
      queryType: { hasEql: true, hasQuery: false },
    });
    const { container } = render(<>{node}</>);
    expect(
      container.querySelector('[data-test-subj="super-timeline-esql-incompatible-icon"]')
    ).toBeInTheDocument();
    expect(
      container.querySelector('[data-test-subj="super-timeline-eql-incompatible-icon"]')
    ).not.toBeInTheDocument();
  });
});
