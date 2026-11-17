/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { TestProviders } from '@kbn/timelines-plugin/public/mock';
import type { GetEntityStoreStatusResponse } from '@kbn/entity-store/common';
import { EntityType } from '../../../../../../../common/entity_analytics/types';
import {
  ENTITY_STORE_CONFIGURATION_TEST_ID,
  ENTITY_STORE_ENGINES_TABLE_TEST_ID,
  ENTITY_STORE_OVERVIEW_TEST_ID,
  ENTITY_STORE_PROBLEMS_TEST_ID,
} from '../../../../../test_ids';
import { EntityStoreSettings } from './entity_store_settings';

jest.mock('../../../hooks/use_entity_counts_by_type', () => ({
  useEntityCountsByType: () => ({ counts: { host: 1240, user: 860 }, isLoading: false }),
}));
jest.mock('./run_history_link', () => ({ RunHistoryLink: () => null }));
jest.mock('./engine_status_header_action', () => ({
  EngineStatusHeaderAction: () => null,
}));

type Engine = GetEntityStoreStatusResponse['engines'][number];

const taskId = 'entity_store:v2:extract_entity_non_priority_task:user:default';

const engine = (type: Engine['type'], overrides: Partial<Engine> = {}): Engine => ({
  type,
  indexPattern: 'logs-*',
  status: 'started',
  frequency: '1m',
  lookbackPeriod: '3h',
  delay: '1m',
  timeout: '59s',
  maxLogsPerPage: 50000,
  fieldHistoryLength: 10,
  components: [
    { id: `.entities.v2.latest.${type}`, installed: true, resource: 'index' },
    {
      id: taskId,
      installed: true,
      resource: 'task',
      status: 'success',
      runs: 5,
      lastError: null,
    },
  ],
  ...overrides,
});

const data = (engines: Engine[]): GetEntityStoreStatusResponse => ({
  status: 'running',
  engines,
  excludedUserNames: ['root'],
  historySnapshot: { status: 'started', frequency: '24h', retentionDays: 60 },
});

const renderSettings = (response: GetEntityStoreStatusResponse) =>
  render(<EntityStoreSettings data={response} entityTypes={[EntityType.host, EntityType.user]} />, {
    wrapper: TestProviders,
  });

describe('EntityStoreSettings', () => {
  it('leads with a healthy status and the entity counts, and shows no problems', () => {
    renderSettings(data([engine('host'), engine('user')]));

    const overview = within(screen.getByTestId(ENTITY_STORE_OVERVIEW_TEST_ID));
    expect(overview.getByText('Healthy')).toBeInTheDocument();
    expect(overview.getByText('1,240')).toBeInTheDocument();
    expect(overview.getByText('860')).toBeInTheDocument();
    expect(screen.queryByTestId(ENTITY_STORE_PROBLEMS_TEST_ID)).not.toBeInTheDocument();
  });

  it('shows engine settings in readable units', () => {
    renderSettings(data([engine('host'), engine('user')]));

    const table = within(screen.getByTestId(ENTITY_STORE_ENGINES_TABLE_TEST_ID));
    expect(table.getAllByText('Every minute')).toHaveLength(2);
    expect(table.getAllByText('3 hours')).toHaveLength(2);
    expect(table.getAllByText('59 seconds')).toHaveLength(2);
    expect(table.getAllByText('50,000')).toHaveLength(2);
    expect(table.getAllByText('10 values')).toHaveLength(2);
    expect(table.getAllByText('Running')).toHaveLength(2);
  });

  it('shows the snapshot and excluded user settings in words', () => {
    renderSettings(data([engine('host')]));

    const settings = within(screen.getByTestId(ENTITY_STORE_CONFIGURATION_TEST_ID));
    expect(settings.getByText('Every 24 hours')).toBeInTheDocument();
    expect(settings.getByText('60 days')).toBeInTheDocument();
    expect(settings.getByText('root')).toBeInTheDocument();
  });

  it('lists a failing task with its name and error, and opens that engine', () => {
    const failing = engine('user', {
      components: [
        {
          id: taskId,
          installed: true,
          resource: 'task',
          status: 'error',
          runs: 9,
          lastError: 'circuit_breaking_exception',
        },
      ],
    });
    renderSettings(data([engine('host'), failing]));

    expect(
      within(screen.getByTestId(ENTITY_STORE_OVERVIEW_TEST_ID)).getByText('Needs attention')
    ).toBeInTheDocument();
    const problems = within(screen.getByTestId(ENTITY_STORE_PROBLEMS_TEST_ID));
    expect(problems.getByText(/Log extraction \(non-priority\)/)).toBeInTheDocument();
    expect(problems.getByText(/circuit_breaking_exception/)).toBeInTheDocument();
    // The callout title and the badge of the engine's accordion.
    expect(screen.getAllByText('1 problem')).toHaveLength(2);
    expect(screen.getByText('Failing')).toBeInTheDocument();
  });
});
