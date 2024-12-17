/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { createCspBenchmarkIntegrationFixture } from '../../test/fixtures/csp_benchmark_integration';
import { BenchmarksTable } from './benchmarks_table';
import { TestProvider } from '../../test/test_provider';
import { getBenchmarkCisName, getBenchmarkApplicableTo } from '../../../common/utils/helpers';

describe('<BenchmarksTable />', () => {
  const tableProps = {
    pageIndex: 1,
    pageSize: 10,
    error: undefined,
    loading: false,
    setQuery: jest.fn(),
  };

  it('renders cis integration name', () => {
    const item = createCspBenchmarkIntegrationFixture();
    const benchmarks = [item];
    const benchmarkCisIntegrationName = getBenchmarkCisName(item.id) || '';

    render(
      <TestProvider>
        <BenchmarksTable
          {...{
            ...tableProps,
            benchmarks,
            totalItemCount: benchmarks.length,
          }}
        />
      </TestProvider>
    );

    expect(screen.getByText(benchmarkCisIntegrationName)).toBeInTheDocument();
  });

  it('renders benchmark version', () => {
    const item = createCspBenchmarkIntegrationFixture();
    const benchmarks = [item];

    render(
      <TestProvider>
        <BenchmarksTable
          {...{
            ...tableProps,
            benchmarks,
            totalItemCount: benchmarks.length,
          }}
        />
      </TestProvider>
    );

    expect(screen.getByText(item.version)).toBeInTheDocument();
  });

  it('renders applicable to', () => {
    const item = createCspBenchmarkIntegrationFixture();
    const benchmarks = [item];
    const benchmarkApplicableTo = getBenchmarkApplicableTo(item.id) || '';
    render(
      <TestProvider>
        <BenchmarksTable
          {...{
            ...tableProps,
            benchmarks,
            totalItemCount: benchmarks.length,
          }}
        />
      </TestProvider>
    );

    expect(screen.getByText(benchmarkApplicableTo)).toBeInTheDocument();
  });

  it('renders evaluated', () => {
    const item = createCspBenchmarkIntegrationFixture();
    const benchmarks = [item];

    render(
      <TestProvider>
        <BenchmarksTable
          {...{
            ...tableProps,
            benchmarks,
            totalItemCount: benchmarks.length,
          }}
        />
      </TestProvider>
    );
    expect(screen.getByText(benchmarks[0].evaluation + ' accounts')).toBeInTheDocument();
  });

  it('renders compliance', () => {
    const item = createCspBenchmarkIntegrationFixture();
    const benchmarks = [item];

    render(
      <TestProvider>
        <BenchmarksTable
          {...{
            ...tableProps,
            benchmarks,
            totalItemCount: benchmarks.length,
          }}
        />
      </TestProvider>
    );

    expect(screen.getByText(item.score.postureScore + '%')).toBeInTheDocument();
  });
});
