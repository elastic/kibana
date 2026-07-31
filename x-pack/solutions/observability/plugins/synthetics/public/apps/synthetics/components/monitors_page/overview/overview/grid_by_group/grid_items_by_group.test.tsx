/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { useSelector } from 'react-redux-v7';

import { GridItemsByGroup } from './grid_items_by_group';
import type { OverviewStatusMetaData } from '../../types';
import { WrappedHelper } from '../../../../../utils/testing';
import { selectOverviewGroupBy, selectServiceLocationsState } from '../../../../../state';
import { selectOverviewStatus } from '../../../../../state/overview_status';
import { useFilters } from '../../../common/monitor_filters/use_filters';

jest.mock('react-redux-v7', () => ({
  ...jest.requireActual('react-redux-v7'),
  useSelector: jest.fn(),
}));

jest.mock('../../../common/monitor_filters/use_filters', () => ({
  useFilters: jest.fn(),
}));

// Stub the accordion so the test doesn't pull in trend-fetching internals; it
// just exposes each rendered group's label and its member monitor ids.
jest.mock('./grid_group_item', () => ({
  GroupGridItem: ({
    groupLabel,
    groupMonitors,
  }: {
    groupLabel: string;
    groupMonitors: OverviewStatusMetaData[];
  }) => (
    <div data-test-subj={`group-${groupLabel}`}>
      {groupMonitors.map((monitor) => (
        <span key={monitor.configId}>{monitor.configId}</span>
      ))}
    </div>
  ),
}));

const heartbeatMonitor = {
  configId: 'hb1',
  origin: 'heartbeat',
  locations: [{ label: 'Heartbeat' }],
} as unknown as OverviewStatusMetaData;

const remoteMonitor = {
  configId: 'rm1',
  remote: { remoteName: 'edge-a' },
  locations: [{ label: 'edge' }],
} as unknown as OverviewStatusMetaData;

const localMonitor = {
  configId: 'ui1',
  locations: [{ label: 'us_east' }],
} as unknown as OverviewStatusMetaData;

const setupSelectors = (groupField: string, allConfigs: OverviewStatusMetaData[]) => {
  (useSelector as jest.Mock).mockImplementation((selector) => {
    if (selector === selectOverviewGroupBy) return { field: groupField, order: 'asc' };
    if (selector === selectOverviewStatus) return { allConfigs, loaded: true };
    if (selector === selectServiceLocationsState) return { locations: [] };
    return {};
  });
  (useFilters as jest.Mock).mockReturnValue({
    monitorTypes: [{ label: 'HTTP', count: 1 }],
    locations: [],
    projects: [],
    tags: [],
  });
};

const renderGrid = () =>
  render(
    <WrappedHelper>
      <GridItemsByGroup setFlyoutConfigCallback={jest.fn()} view="cardView" />
    </WrappedHelper>
  );

const idsIn = (groupLabel: string) => {
  const group = document.querySelector(`[data-test-subj="group-${groupLabel}"]`);
  return Array.from(group?.querySelectorAll('span') ?? []).map((el) => el.textContent);
};

describe('GridItemsByGroup origin grouping', () => {
  afterEach(() => jest.clearAllMocks());

  it('buckets by Monitor source: Heartbeat / Remote / Local', () => {
    setupSelectors('origin', [heartbeatMonitor, remoteMonitor, localMonitor]);
    renderGrid();

    expect(idsIn('Heartbeat monitors')).toEqual(['hb1']);
    expect(idsIn('Remote monitors')).toEqual(['rm1']);
    expect(idsIn('Local monitors')).toEqual(['ui1']);
  });

  // Regression: heartbeat monitors used to hide inside the "Local monitors"
  // catch-all when grouping by Remote cluster. They now get their own bucket.
  it('splits heartbeat out of Local when grouping by Remote cluster', () => {
    setupSelectors('remoteName', [heartbeatMonitor, remoteMonitor, localMonitor]);
    renderGrid();

    expect(idsIn('edge-a')).toEqual(['rm1']);
    expect(idsIn('Heartbeat monitors')).toEqual(['hb1']);
    expect(idsIn('Local monitors')).toEqual(['ui1']);
  });
});
