/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, render, screen } from '@testing-library/react';
import React from 'react';

import {
  TestDataQualityProviders,
  TestExternalProviders,
} from '../../../mock/test_providers/test_providers';
import { IndexToCheck } from '../../../types';
import { CheckStatus, EMPTY_LAST_CHECKED_DATE } from '.';

const indexToCheck: IndexToCheck = {
  pattern: 'auditbeat-*',
  indexName: '.ds-auditbeat-8.6.1-2023.02.13-000001',
};
const checkAllIndiciesChecked = 2;
const checkAllTotalIndiciesToCheck = 3;

describe('CheckStatus', () => {
  describe('when `indexToCheck` is not null', () => {
    beforeEach(() => {
      render(
        <TestExternalProviders>
          <TestDataQualityProviders dataQualityContextProps={{ lastChecked: '' }}>
            <CheckStatus
              checkAllIndiciesChecked={checkAllIndiciesChecked}
              checkAllTotalIndiciesToCheck={checkAllTotalIndiciesToCheck}
              errorSummary={[]}
              indexToCheck={indexToCheck}
            />
          </TestDataQualityProviders>
        </TestExternalProviders>
      );
    });

    test('it renders progress with the expected max value', () => {
      expect(screen.getByTestId('progress')).toHaveAttribute(
        'max',
        String(checkAllTotalIndiciesToCheck)
      );
    });

    test('it renders progress with the expected current value', () => {
      expect(screen.getByTestId('progress')).toHaveAttribute(
        'value',
        String(checkAllIndiciesChecked)
      );
    });

    test('it renders the expected "checking <index name>" message', () => {
      expect(screen.getByTestId('checking')).toHaveTextContent(
        `Checking ${indexToCheck.indexName}`
      );
    });

    test('it does NOT render the last checked message', () => {
      expect(screen.queryByTestId('lastChecked')).not.toBeInTheDocument();
    });
  });

  describe('when `indexToCheck` is null', () => {
    beforeEach(() => {
      render(
        <TestExternalProviders>
          <TestDataQualityProviders dataQualityContextProps={{ lastChecked: '' }}>
            <CheckStatus
              checkAllIndiciesChecked={checkAllIndiciesChecked}
              checkAllTotalIndiciesToCheck={checkAllTotalIndiciesToCheck}
              errorSummary={[]}
              indexToCheck={null}
            />
          </TestDataQualityProviders>
        </TestExternalProviders>
      );
    });

    test('it does NOT render the progress bar', () => {
      expect(screen.queryByTestId('progress')).not.toBeInTheDocument();
    });

    test('it does NOT render the "checking <index name>" message', () => {
      expect(screen.queryByTestId('checking')).not.toBeInTheDocument();
    });

    test('it renders the expected last checked message', () => {
      expect(screen.getByTestId('lastChecked')).toHaveTextContent(EMPTY_LAST_CHECKED_DATE);
    });
  });

  test('it renders the errors popover when errors have occurred', () => {
    const errorSummary = [
      {
        pattern: '.alerts-security.alerts-default',
        indexName: null,
        error: 'Error loading stats: Error: Forbidden',
      },
    ];

    render(
      <TestExternalProviders>
        <TestDataQualityProviders dataQualityContextProps={{ lastChecked: '' }}>
          <CheckStatus
            checkAllIndiciesChecked={checkAllIndiciesChecked}
            checkAllTotalIndiciesToCheck={checkAllTotalIndiciesToCheck}
            errorSummary={errorSummary}
            indexToCheck={null}
          />
        </TestDataQualityProviders>
      </TestExternalProviders>
    );

    expect(screen.getByTestId('errorsPopover')).toBeInTheDocument();
  });

  test('it does NOT render the errors popover when errors have NOT occurred', () => {
    render(
      <TestExternalProviders>
        <TestDataQualityProviders dataQualityContextProps={{ lastChecked: '' }}>
          <CheckStatus
            checkAllIndiciesChecked={checkAllIndiciesChecked}
            checkAllTotalIndiciesToCheck={checkAllTotalIndiciesToCheck}
            errorSummary={[]} // <-- no errors
            indexToCheck={null}
          />
        </TestDataQualityProviders>
      </TestExternalProviders>
    );

    expect(screen.queryByTestId('errorsPopover')).not.toBeInTheDocument();
  });

  test('it invokes the `setLastChecked` callback when indexToCheck is not null', () => {
    jest.useFakeTimers();
    const date = '2023-03-28T22:27:28.159Z';
    jest.setSystemTime(new Date(date));

    const setLastChecked = jest.fn();

    render(
      <TestExternalProviders>
        <TestDataQualityProviders dataQualityContextProps={{ lastChecked: '', setLastChecked }}>
          <CheckStatus
            checkAllIndiciesChecked={checkAllIndiciesChecked}
            checkAllTotalIndiciesToCheck={checkAllTotalIndiciesToCheck}
            errorSummary={[]}
            indexToCheck={indexToCheck}
          />
        </TestDataQualityProviders>
      </TestExternalProviders>
    );

    expect(setLastChecked).toBeCalledWith(date);
    jest.useRealTimers();
  });

  test('it updates the formatted date', async () => {
    jest.useFakeTimers();
    const date = '2023-03-28T23:27:28.159Z';
    jest.setSystemTime(new Date(date));

    const { rerender } = render(
      <TestExternalProviders>
        <TestDataQualityProviders dataQualityContextProps={{ lastChecked: '' }}>
          <CheckStatus
            checkAllIndiciesChecked={checkAllIndiciesChecked}
            checkAllTotalIndiciesToCheck={checkAllTotalIndiciesToCheck}
            errorSummary={[]}
            indexToCheck={indexToCheck}
          />
        </TestDataQualityProviders>
      </TestExternalProviders>
    );

    // re-render with an updated `lastChecked`
    const lastChecked = '2023-03-28T22:27:28.159Z';

    act(() => {
      jest.advanceTimersByTime(1000 * 61);
    });

    rerender(
      <TestExternalProviders>
        <TestDataQualityProviders dataQualityContextProps={{ lastChecked }}>
          <CheckStatus
            checkAllIndiciesChecked={checkAllIndiciesChecked}
            checkAllTotalIndiciesToCheck={checkAllTotalIndiciesToCheck}
            errorSummary={[]}
            indexToCheck={null} // <-- also updated
          />
        </TestDataQualityProviders>
      </TestExternalProviders>
    );

    act(() => {
      // once again, advance time
      jest.advanceTimersByTime(1000 * 61);
    });

    expect(await screen.getByTestId('lastChecked')).toHaveTextContent('Last checked: an hour ago');
    jest.useRealTimers();
  });
});
