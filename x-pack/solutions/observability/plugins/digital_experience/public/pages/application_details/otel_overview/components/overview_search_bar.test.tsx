/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import type { StatefulSearchBarProps } from '@kbn/unified-search-plugin/public';
import { useKibanaServices } from '../../../../hooks/use_kibana_services';
import { useOverviewKuery } from '../../../../hooks/use_overview_search';
import { OverviewSearchBar } from './overview_search_bar';

jest.mock('../../../../hooks/use_kibana_services');
jest.mock('../../../../hooks/use_overview_search');

const DATE_RANGE = { from: '2021-01-18T12:00:00.000Z', to: '2021-01-18T13:00:00.000Z' };

let searchBarProps: StatefulSearchBarProps | undefined;

/** Stands in for the Unified Search bar: the test submits what the user would. */
const SearchBar = (props: StatefulSearchBarProps) => {
  searchBarProps = props;
  return <div data-test-subj="searchBar" />;
};

const dataView = { id: 'adhoc' };
const create = jest.fn();
const setKuery = jest.fn();
const onRefresh = jest.fn();

const resetSearchBarProps = () => {
  searchBarProps = undefined;
};

const submit = (query: string) =>
  act(() => {
    searchBarProps?.onQuerySubmit?.(
      { dateRange: DATE_RANGE, query: { query, language: 'kuery' } },
      true
    );
  });

const mockKuery = (kuery?: string) =>
  jest.mocked(useOverviewKuery).mockReturnValue({ kuery, setKuery });

/** Renders the bar, which shows once the data view is created, or could not be. */
const renderBar = async () => {
  render(<OverviewSearchBar onRefresh={onRefresh} />, { wrapper: EuiProvider });
  await waitFor(() => expect(searchBarProps).toBeDefined());
};

beforeEach(() => {
  jest.clearAllMocks();
  searchBarProps = undefined;
  create.mockResolvedValue(dataView);
  jest.mocked(useKibanaServices).mockReturnValue({
    unifiedSearch: { ui: { SearchBar } },
    data: { dataViews: { create } },
  } as unknown as ReturnType<typeof useKibanaServices>);
  mockKuery(undefined);
});

describe('OverviewSearchBar', () => {
  it('shows a placeholder as tall as the bar until the data view is there, so the bar never restarts', async () => {
    let resolveDataView: (value: unknown) => void = () => {};
    create.mockReturnValue(new Promise((resolve) => (resolveDataView = resolve)));
    render(<OverviewSearchBar onRefresh={onRefresh} />, { wrapper: EuiProvider });

    expect(screen.getByTestId('digitalExperienceOverviewSearchBarLoading')).toBeInTheDocument();
    expect(searchBarProps).toBeUndefined();

    await act(async () => resolveDataView(dataView));

    expect(
      screen.queryByTestId('digitalExperienceOverviewSearchBarLoading')
    ).not.toBeInTheDocument();
    expect(searchBarProps?.indexPatterns).toEqual([dataView]);
  });

  it('takes KQL only: the date picker, the query menu, the filter bar and a submit button are left out', async () => {
    await renderBar();

    expect(searchBarProps).toMatchObject({
      showQueryInput: true,
      showDatePicker: false,
      showQueryMenu: false,
      showFilterBar: false,
      showSubmitButton: false,
      query: { query: '', language: 'kuery' },
    });
  });

  it('shows the query of the URL', async () => {
    mockKuery('user_agent.name: Chrome');
    await renderBar();

    expect(searchBarProps?.query).toEqual({ query: 'user_agent.name: Chrome', language: 'kuery' });
  });

  it('suggests the fields of the OTel logs and traces through an ad hoc data view', async () => {
    await renderBar();

    expect(searchBarProps?.indexPatterns).toEqual([dataView]);
    expect(create).toHaveBeenCalledWith(
      { title: 'logs-*.otel-*,traces-*.otel-*', timeFieldName: '@timestamp' },
      undefined,
      false
    );
  });

  it('still takes KQL when there is no data view, e.g. before any data arrived', async () => {
    create.mockRejectedValue(new Error('No matching indices found'));
    await renderBar();

    expect(create).toHaveBeenCalled();
    expect(searchBarProps?.indexPatterns).toBeUndefined();
    expect(searchBarProps?.showQueryInput).toBe(true);
  });

  it('creates the data view once, not at every mount, e.g. when back from another tab', async () => {
    const { unmount } = render(<OverviewSearchBar onRefresh={onRefresh} />, {
      wrapper: EuiProvider,
    });
    await waitFor(() => expect(searchBarProps).toBeDefined());
    unmount();
    resetSearchBarProps();

    render(<OverviewSearchBar onRefresh={onRefresh} />, { wrapper: EuiProvider });
    await waitFor(() => expect(searchBarProps).toBeDefined());

    expect(create).toHaveBeenCalledTimes(1);
    expect(searchBarProps?.indexPatterns).toEqual([dataView]);
  });

  it('tries again at the next mount when there was no data view to make', async () => {
    create.mockRejectedValueOnce(new Error('No matching indices found'));
    const { unmount } = render(<OverviewSearchBar onRefresh={onRefresh} />, {
      wrapper: EuiProvider,
    });
    await waitFor(() => expect(searchBarProps).toBeDefined());
    expect(searchBarProps?.indexPatterns).toBeUndefined();
    unmount();
    resetSearchBarProps();

    render(<OverviewSearchBar onRefresh={onRefresh} />, { wrapper: EuiProvider });
    await waitFor(() => expect(searchBarProps?.indexPatterns).toEqual([dataView]));

    expect(create).toHaveBeenCalledTimes(2);
  });

  it('sets a new query, trimmed', async () => {
    await renderBar();

    submit('  user_agent.name: Chrome  ');

    expect(setKuery).toHaveBeenCalledWith('user_agent.name: Chrome');
    expect(onRefresh).not.toHaveBeenCalled();
  });

  it('sets an emptied query, which removes it', async () => {
    mockKuery('user_agent.name: Chrome');
    await renderBar();

    submit('');

    expect(setKuery).toHaveBeenCalledWith('');
  });

  it('refreshes when the query did not change, e.g. on Enter again', async () => {
    mockKuery('user_agent.name: Chrome');
    await renderBar();

    submit('user_agent.name: Chrome');

    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(setKuery).not.toHaveBeenCalled();
  });

  it('shows where a query does not parse, and sets nothing', async () => {
    await renderBar();

    submit('user_agent.name: (Chrome');

    expect(screen.getByTestId('digitalExperienceOverviewKueryError')).toBeInTheDocument();
    expect(setKuery).not.toHaveBeenCalled();
    expect(onRefresh).not.toHaveBeenCalled();
  });

  it('refuses a field named by a pattern, which no field has the name of, and sets nothing', async () => {
    await renderBar();

    submit('browser.*: "Chrome"');

    expect(screen.getByTestId('digitalExperienceOverviewKueryError')).toHaveTextContent(
      'browser.* has a wildcard'
    );
    expect(setKuery).not.toHaveBeenCalled();
    expect(onRefresh).not.toHaveBeenCalled();
  });

  it('drops the error once a valid query is submitted', async () => {
    await renderBar();
    submit('user_agent.name: (Chrome');
    expect(screen.getByTestId('digitalExperienceOverviewKueryError')).toBeInTheDocument();

    submit('user_agent.name: Chrome');

    expect(screen.queryByTestId('digitalExperienceOverviewKueryError')).not.toBeInTheDocument();
    expect(setKuery).toHaveBeenCalledWith('user_agent.name: Chrome');
  });
});
