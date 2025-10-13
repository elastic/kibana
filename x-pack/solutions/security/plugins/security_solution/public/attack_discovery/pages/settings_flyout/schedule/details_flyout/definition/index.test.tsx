/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, screen } from '@testing-library/react';

import { ScheduleDefinition } from '.';
import { useCreateDataView } from '../../../../../../common/hooks/use_create_data_view';
import { TestProviders } from '../../../../../../common/mock';
import { mockAttackDiscoverySchedule } from '../../../../mock/mock_attack_discovery_schedule';
import { useIsExperimentalFeatureEnabled } from '../../../../../../common/hooks/use_experimental_features';

jest.mock('../../../../../../common/hooks/use_create_data_view');
jest.mock('../../../../../../common/hooks/use_experimental_features');

const mockUseCreateDataView = useCreateDataView as jest.MockedFunction<typeof useCreateDataView>;

const renderComponent = async (schedule = mockAttackDiscoverySchedule) => {
  await act(() => {
    render(<TestProviders>{<ScheduleDefinition schedule={schedule} />}</TestProviders>);
  });
};

describe('ScheduleDefinition', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(false);
    mockUseCreateDataView.mockReturnValue({
      getIndexPattern: () => 'logstash-*',
      fields: [{ name: '_type' }],
    } as unknown as jest.Mocked<ReturnType<typeof useCreateDataView>>);
  });

  it('should render definition title', async () => {
    await renderComponent();

    expect(screen.getByTestId('definitionTitle')).toBeInTheDocument();
  });

  it('should render definition details section', async () => {
    await renderComponent();

    expect(screen.getByTestId('scheduleDetailsDefinition')).toBeInTheDocument();
  });

  it('should render details list', async () => {
    await renderComponent();

    expect(screen.getByTestId('listItemColumnScheduleDescription')).toBeInTheDocument();
  });

  it('should render filters title if any set', async () => {
    const scheduleWithFilters = { ...mockAttackDiscoverySchedule };
    scheduleWithFilters.params.filters = [
      { meta: { index: 'logstash-*' }, query: { exists: { field: '_type' } } },
    ];
    await renderComponent(scheduleWithFilters);

    expect(screen.getByTestId('filtersTitle')).toBeInTheDocument();
  });

  it('should render filters value if any set', async () => {
    const scheduleWithFilters = { ...mockAttackDiscoverySchedule };
    scheduleWithFilters.params.filters = [
      { meta: { index: 'logstash-*' }, query: { exists: { field: '_type' } } },
    ];
    await renderComponent(scheduleWithFilters);

    expect(screen.getByTestId('filtersValue')).toBeInTheDocument();
  });

  it('should not render filters title if none set', async () => {
    const scheduleWithFilters = { ...mockAttackDiscoverySchedule };
    scheduleWithFilters.params.filters = [];
    await renderComponent(scheduleWithFilters);

    expect(screen.queryByTestId('filtersTitle')).not.toBeInTheDocument();
  });

  it('should not render filters value if none set', async () => {
    const scheduleWithFilters = { ...mockAttackDiscoverySchedule };
    scheduleWithFilters.params.filters = undefined;
    await renderComponent(scheduleWithFilters);

    expect(screen.queryByTestId('filtersValue')).not.toBeInTheDocument();
  });

  it('should render query title if set', async () => {
    const scheduleWithFilters = { ...mockAttackDiscoverySchedule };
    scheduleWithFilters.params.query = { query: 'host.name: *', language: 'kuery' };
    await renderComponent(scheduleWithFilters);

    expect(screen.getByTestId('queryTitle')).toBeInTheDocument();
  });

  it('should render query value if set', async () => {
    const scheduleWithFilters = { ...mockAttackDiscoverySchedule };
    scheduleWithFilters.params.query = { query: 'host.name: *', language: 'kuery' };
    await renderComponent(scheduleWithFilters);

    expect(screen.getByTestId('queryValue')).toBeInTheDocument();
  });

  it('should not render query title if not set', async () => {
    const scheduleWithFilters = { ...mockAttackDiscoverySchedule };
    scheduleWithFilters.params.query = { query: '', language: 'kuery' };
    await renderComponent(scheduleWithFilters);

    expect(screen.queryByTestId('queryTitle')).not.toBeInTheDocument();
  });

  it('should not render query value if not set', async () => {
    const scheduleWithFilters = { ...mockAttackDiscoverySchedule };
    scheduleWithFilters.params.query = undefined;
    await renderComponent(scheduleWithFilters);

    expect(screen.queryByTestId('queryValue')).not.toBeInTheDocument();
  });

  it('should render query language title if query is set', async () => {
    const scheduleWithFilters = { ...mockAttackDiscoverySchedule };
    scheduleWithFilters.params.query = { query: 'host.name: *', language: 'kuery' };
    await renderComponent(scheduleWithFilters);

    expect(screen.getByTestId('queryLanguageTitle')).toBeInTheDocument();
  });

  it('should render query language value if query is set', async () => {
    const scheduleWithFilters = { ...mockAttackDiscoverySchedule };
    scheduleWithFilters.params.query = { query: 'host.name: *', language: 'kuery' };
    await renderComponent(scheduleWithFilters);

    expect(screen.getByTestId('queryLanguageValue')).toBeInTheDocument();
  });

  it('should not render query language title if query is not set', async () => {
    const scheduleWithFilters = { ...mockAttackDiscoverySchedule };
    scheduleWithFilters.params.query = { query: '', language: 'kuery' };
    await renderComponent(scheduleWithFilters);

    expect(screen.queryByTestId('queryLanguageTitle')).not.toBeInTheDocument();
  });

  it('should not render query language value if query is not set', async () => {
    const scheduleWithFilters = { ...mockAttackDiscoverySchedule };
    scheduleWithFilters.params.query = undefined;
    await renderComponent(scheduleWithFilters);

    expect(screen.queryByTestId('queryLanguageValue')).not.toBeInTheDocument();
  });

  it('should render interval title', async () => {
    await renderComponent();

    expect(screen.getByTestId('scheduleIntervalTitle')).toBeInTheDocument();
  });

  it('should render interval value', async () => {
    await renderComponent();

    expect(screen.getByTestId('scheduleIntervalValue')).toBeInTheDocument();
  });

  it('should render connector title', async () => {
    await renderComponent();

    expect(screen.getByTestId('connectorTitle')).toBeInTheDocument();
  });

  it('should render connector value', async () => {
    await renderComponent();

    expect(screen.getByTestId('connectorValue')).toBeInTheDocument();
  });
});
