/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, render, waitFor } from '@testing-library/react';
import type { History, Location } from 'history';
import moment from 'moment-timezone';
import * as React from 'react';
import { MemoryRouter, Router } from '@kbn/shared-ux-router';

import type { UrlParams } from './types';
import { UrlParamsContext, UrlParamsProvider } from './url_params_context';

function renderHelper(location: Location) {
  return render(
    <MemoryRouter initialEntries={[location]}>
      <UrlParamsProvider>
        <UrlParamsContext.Consumer>
          {({ urlParams }: { urlParams: UrlParams }) => (
            <span id="data" role="code">
              {JSON.stringify(urlParams, null, 2)}
            </span>
          )}
        </UrlParamsContext.Consumer>
      </UrlParamsProvider>
    </MemoryRouter>
  );
}

describe('UrlParamsContext', () => {
  beforeAll(() => {
    moment.tz.setDefault('Etc/GMT');
  });

  afterAll(() => {
    moment.tz.setDefault('');
  });

  it('should read values in from location', () => {
    const location = {
      pathname: '/test/pathname',
      search: '?rangeFrom=2010-03-15T12:00:00Z&rangeTo=2010-04-10T12:00:00Z&transactionId=123abc',
    } as Location;

    const { getByRole } = renderHelper(location);
    const contentElement = getByRole('code');
    expect(contentElement.textContent).not.toBeNull();
    const data: any = JSON.parse(contentElement.textContent!);
    expect(data.start).toEqual('2010-03-15T12:00:00.000Z');
    expect(data.end).toEqual('2010-04-10T12:00:00.000Z');
  });

  it('should update param values if location has changed', () => {
    const location = {
      pathname: '/test/updated',
      search: '?rangeFrom=2009-03-15T12:00:00Z&rangeTo=2009-04-10T12:00:00Z&transactionId=UPDATED',
    } as Location;

    const { getByRole, rerender } = renderHelper(location);

    // Create a new location to simulate location change
    const updatedLocation = {
      ...location,
      key: 'updatedKey', // Add a key change to trigger update
    };

    // Rerender with updated location
    rerender(
      <MemoryRouter initialEntries={[updatedLocation]}>
        <UrlParamsProvider>
          <UrlParamsContext.Consumer>
            {({ urlParams }: { urlParams: UrlParams }) => (
              <span id="data" role="code">
                {JSON.stringify(urlParams, null, 2)}
              </span>
            )}
          </UrlParamsContext.Consumer>
        </UrlParamsProvider>
      </MemoryRouter>
    );

    // Get data from the rendered output
    const contentElement = getByRole('code');
    const data = JSON.parse(contentElement.textContent!);

    expect([data.start, data.end]).toEqual([
      '2009-03-15T12:00:00.000Z',
      '2009-04-10T12:00:00.000Z',
    ]);
  });

  it('should parse relative time ranges on mount', () => {
    const location = {
      pathname: '/test/updated',
      search: '?rangeFrom=now-1d%2Fd&rangeTo=now-1d%2Fd&transactionId=UPDATED',
    } as Location;

    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(0);

    // Use renderHelper instead of mountParams
    const { getByRole, rerender } = renderHelper(location);

    // Force an update by re-rendering with the same content
    rerender(
      <MemoryRouter initialEntries={[location]}>
        <UrlParamsProvider>
          <UrlParamsContext.Consumer>
            {({ urlParams }: { urlParams: UrlParams }) => (
              <span id="data" role="code">
                {JSON.stringify(urlParams, null, 2)}
              </span>
            )}
          </UrlParamsContext.Consumer>
        </UrlParamsProvider>
      </MemoryRouter>
    );

    // Get data directly from the DOM using getByRole
    const contentElement = getByRole('code');
    const params = JSON.parse(contentElement.textContent!);

    expect([params.start, params.end]).toEqual([
      '1969-12-31T00:00:00.000Z',
      '1969-12-31T23:59:59.999Z',
    ]);

    nowSpy.mockRestore();
  });

  it('should refresh the time range with new values if time range is relative', async () => {
    const history = {
      location: {
        pathname: '/test',
      },
      listen: jest.fn(),
    } as unknown as History;

    jest.spyOn(Date, 'now').mockImplementation(() => new Date('2000-06-15T12:00:00Z').getTime());

    const { getByRole } = render(
      <Router history={history}>
        <UrlParamsProvider>
          <UrlParamsContext.Consumer>
            {({ urlParams, refreshTimeRange }) => {
              return (
                <React.Fragment>
                  <span id="data" role="code" data-testid="params-data">
                    {JSON.stringify(urlParams, null, 2)}
                  </span>
                  <button
                    data-testid="refresh-button"
                    onClick={() =>
                      refreshTimeRange({
                        rangeFrom: 'now-1d/d',
                        rangeTo: 'now-1d/d',
                      })
                    }
                  />
                </React.Fragment>
              );
            }}
          </UrlParamsContext.Consumer>
        </UrlParamsProvider>
      </Router>
    );

    await waitFor(() => {});

    // Click the button using fireEvent instead of simulate
    fireEvent.click(getByRole('button'));

    await waitFor(() => {
      // Get data directly from the DOM
      const contentElement = getByRole('code');
      const params = JSON.parse(contentElement.textContent!);

      expect([params.start, params.end]).toEqual([
        '2000-06-14T00:00:00.000Z',
        '2000-06-14T23:59:59.999Z',
      ]);
    });
  });
});
