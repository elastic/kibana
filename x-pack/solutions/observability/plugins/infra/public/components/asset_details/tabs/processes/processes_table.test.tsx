/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { ProcessesTable } from './processes_table';
import type { ProcessListAPIResponse } from '../../../../../common/http_api';
import type { SortBy } from '../../hooks/use_process_list';

const processListData = [
  {
    cpu: 0.046,
    memory: 0.132,
    startTime: 1739179952247,
    pid: 29568,
    state: 'idle',
    user: 'test_user',
    command: '/some/test/command here 1',
  },
  {
    cpu: 0.007,
    memory: 0.001,
    startTime: 1738773747062,
    pid: 74219,
    state: 'stopped',
    user: 'test_user',
    command: '/some/test/command here 2',
  },
  {
    cpu: 0.005,
    memory: 0.005,
    startTime: 1738773747695,
    pid: 74253,
    state: 'dead',
    user: 'test_user',
    command: '/some/test/command here 3',
  },
  {
    cpu: 0,
    memory: 0.066,
    startTime: 1738662040493,
    pid: 85241,
    state: 'sleeping',
    user: 'test_user',
    command: '/some/test/command here 0 cpu',
  },
  {
    cpu: 0.003,
    memory: 0.004,
    startTime: 1738575009421,
    pid: 1219,
    state: 'running',
    user: 'test_user',
    command:
      'node /some/extra/long/test/command -name=ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz012345abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz012345pqrstuvwxyz012345',
  },
];

const renderProcessesTable = ({
  isLoading = false,
  processList,
  error = undefined,
}: {
  isLoading?: boolean;
  processList: ProcessListAPIResponse['processList'];
  error?: string;
}) =>
  render(
    <IntlProvider locale="en">
      <ProcessesTable
        currentTime={1739180032015}
        isLoading={isLoading}
        processList={processList}
        sortBy={{
          name: 'cpu',
          isAscending: false,
        }}
        error={error}
        clearSearchBar={() => {}}
        setSortBy={(s: SortBy) => {}}
      />
    </IntlProvider>
  );

describe('Processes Table', () => {
  it('should return process table with 5 processes', () => {
    const result = renderProcessesTable({ processList: processListData });
    expect(result.queryByTestId('infraAssetDetailsProcessesTable')).toBeInTheDocument();

    // Header
    expect(result.queryByTestId('state-header')).toBeInTheDocument();
    expect(result.queryByTestId('command-header')).toBeInTheDocument();
    expect(result.queryByTestId('startTime-header')).toBeInTheDocument();
    expect(result.queryByTestId('cpu-header')).toHaveAttribute('aria-sort', 'descending');
    expect(result.queryByTestId('memory-header')).toBeInTheDocument();

    // Status
    expect(result.getByText('Running')).toBeInTheDocument();
    expect(result.getByText('Sleeping')).toBeInTheDocument();
    expect(result.getByText('Stopped')).toBeInTheDocument();
    expect(result.getByText('Idle')).toBeInTheDocument();
    expect(result.getByText('Dead')).toBeInTheDocument();

    // Command
    expect(result.getByText('/some/test/command here 1')).toBeInTheDocument();
    expect(result.getByText('/some/test/command here 2')).toBeInTheDocument();
    expect(result.getByText('/some/test/command here 3')).toBeInTheDocument();
    expect(result.getByText('/some/test/command here 0 cpu')).toBeInTheDocument();
    expect(
      result.getByText(
        'node /some/extra/long/test/command -name=ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz012345abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz012345pqrstuvwxyz012345'
      )
    ).toBeInTheDocument();

    // CPU & Memmory
    expect(result.getByText('4.6%')).toBeInTheDocument();
    expect(result.getByText('13.2%')).toBeInTheDocument();
    expect(result.getByText('0.7%')).toBeInTheDocument();
    expect(result.getByText('0.1%')).toBeInTheDocument();
    expect(result.getByText('0%')).toBeInTheDocument();
    expect(result.getByText('6.6%')).toBeInTheDocument();
  });

  it('should return loading text if loading and no items', () => {
    const result = renderProcessesTable({ isLoading: true, processList: [] });
    expect(result.getByText('Loading...')).toBeInTheDocument();
  });

  it('should return error if error is defined', () => {
    const result = renderProcessesTable({
      error: 'Test Error Message',
      processList: processListData,
    });
    expect(result.getByText('Test Error Message')).toBeInTheDocument();
    expect(result.queryByTestId('infraAssetDetailsProcessesSearchInputError')).toBeInTheDocument();
  });

  it('should return empty state if no process are found', () => {
    const result = renderProcessesTable({
      processList: [],
    });
    expect(result.getByText('No processes found')).toBeInTheDocument();
    expect(result.queryByTestId('infraProcessesTableTopNByCpuOrMemoryLink')).toBeInTheDocument();
    expect(result.queryByTestId('infraProcessesTableClearFiltersButton')).toBeInTheDocument();
  });

  it('should match a snapshot with a single process with long command found', () => {
    const result = renderProcessesTable({ processList: [processListData[4]] });
    expect(result.queryByTestId('infraAssetDetailsProcessesTable')).toBeInTheDocument();
    expect(result).toMatchSnapshot();
  });
});
