/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { AppContextTestRender } from '../../../../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../../../../common/mock/endpoint';
import { endpointPageHttpMock } from '../../../mocks';
import { act, waitFor, cleanup, fireEvent } from '@testing-library/react';
import { getEndpointListPath } from '../../../../../common/routing';
import { AdminSearchBar } from '../search_bar';
import { uiQueryParams } from '../../../store/selectors';
import type { EndpointIndexUIQueryParams } from '../../../types';

jest.mock('rxjs', () => {
  const actual = jest.requireActual('rxjs');
  return {
    ...actual,
    firstValueFrom: async () => ({ indexFields: [] }),
  };
});

describe('when rendering the endpoint list `AdminSearchBar`', () => {
  let render: (
    urlParams?: EndpointIndexUIQueryParams
  ) => Promise<ReturnType<AppContextTestRender['render']>>;
  let waitForAction: AppContextTestRender['middlewareSpy']['waitForAction'];
  let renderResult: ReturnType<AppContextTestRender['render']>;
  let store: AppContextTestRender['store'];

  const getQueryParamsFromStore = () => uiQueryParams(store.getState().management.endpoints);

  const submitQuery = async (kqlQueryValue: string): Promise<void> => {
    const changeUrlActionDone = waitForAction('userChangedUrl');
    const searchBarInput = renderResult.getByTestId('adminSearchBar') as HTMLTextAreaElement;
    const querySubmitButton = renderResult.getByTestId('querySubmitButton') as HTMLButtonElement;

    act(() => {
      fireEvent.change(searchBarInput, {
        target: {
          value: kqlQueryValue,
        },
      });
    });

    // Wait for the search bar to actually display our value
    await act(async () => {
      await waitFor(() => !!searchBarInput.value);
    });

    await act(async () => {
      fireEvent.click(querySubmitButton);
      await changeUrlActionDone;
    });
  };

  beforeEach(() => {
    const mockedContext = createAppRootMockRenderer();

    waitForAction = mockedContext.middlewareSpy.waitForAction;
    store = mockedContext.store;
    endpointPageHttpMock(mockedContext.coreStart.http);

    render = async (urlParams = {}) => {
      mockedContext.history.push(getEndpointListPath({ ...urlParams, name: 'endpointList' }));
      renderResult = mockedContext.render(<AdminSearchBar />);
      // The SearchBar is rendered using `React.lazy` so we need to wait for it to actually show up
      await waitFor(() => renderResult.getByTestId('adminSearchBar'));
      return renderResult;
    };
  });

  afterEach(() => {
    cleanup();
  });

  it('should pre-populate with value from url', async () => {
    await render({ admin_query: "(language:kuery,query:'foo')" });
    const searchBarInput = renderResult.getByTestId('adminSearchBar') as HTMLTextAreaElement;

    expect(searchBarInput.value).toBe('foo');
  });

  it('should update the url with the `admin_query` param if a query was entered', async () => {
    await render();
    await submitQuery('host.name: foo');

    expect(getQueryParamsFromStore().admin_query).toBe("(language:kuery,query:'host.name: foo')");
  });

  it.each([
    ['nothing', ''],
    ['spaces', '  '],
  ])(
    'should update the url and exclude the `admin_query` param when %s was entered',
    async (_, value) => {
      await render({ admin_query: "(language:kuery,query:'foo')" });
      await submitQuery(value);

      expect(getQueryParamsFromStore().admin_query).toBe(undefined);
    }
  );

  it('should reset the `page_index` to zero if query changes', async () => {
    await render({ page_index: '10' });
    await submitQuery('foo');

    expect(getQueryParamsFromStore().page_index).toBe('0');
  });

  it('should not reset the `page_index` if query unchanged', async () => {
    const pageIndex = '10';
    await render({ admin_query: "(language:kuery,query:'foo')", page_index: pageIndex });
    await submitQuery('foo');

    expect(getQueryParamsFromStore().page_index).toBe(pageIndex);
  });
});
