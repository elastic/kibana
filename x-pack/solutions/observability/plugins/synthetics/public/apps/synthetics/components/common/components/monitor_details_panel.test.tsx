/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { MonitorDetailsPanel } from './monitor_details_panel';
import type {
  EncryptedSyntheticsSavedMonitor,
  RemoteSyntheticsMonitor,
} from '../../../../../../common/runtime_types';
import { MonitorTypeEnum } from '../../../../../../common/runtime_types';

jest.mock('react-redux', () => ({
  useDispatch: () => jest.fn(),
}));

jest.mock('../../../../../hooks/use_kibana_space', () => ({
  useKibanaSpace: () => ({ space: { id: 'default' } }),
}));

jest.mock('../../../hooks', () => ({
  useGetUrlParams: () => ({ spaceId: undefined, remoteName: undefined }),
}));

jest.mock('../../../../../hooks/use_date_format', () => ({
  useDateFormat: () => (ts?: string) => ts ?? '',
}));

jest.mock('../../monitors_page/management/monitor_list_table/monitor_enabled', () => ({
  MonitorEnabled: () => <div data-test-subj="monitorEnabledStub" />,
}));

jest.mock('../../monitor_details/monitor_summary/locations_status', () => ({
  LocationsStatus: () => <div data-test-subj="locationsStatusStub" />,
}));

jest.mock('@kbn/observability-shared-plugin/public', () => ({
  TagsList: ({ tags }: { tags: string[] }) => (
    <div data-test-subj="tagsListStub">{tags.join(',')}</div>
  ),
}));

const localMonitor = {
  config_id: 'config-1',
  id: 'config-1',
  name: 'Local monitor',
  type: MonitorTypeEnum.BROWSER,
  tags: ['env:prod'],
  enabled: true,
  schedule: { number: '5', unit: 'm' },
  locations: [{ id: 'us-east', label: 'US East' }],
  updated_at: '2026-01-01T00:00:00Z',
  origin: 'ui',
  project_id: '',
  labels: {},
} as unknown as EncryptedSyntheticsSavedMonitor;

const remoteMonitor: RemoteSyntheticsMonitor = {
  config_id: 'config-1',
  id: 'config-1',
  name: 'Remote monitor',
  type: MonitorTypeEnum.BROWSER,
  tags: ['env:prod'],
  locations: [{ id: 'us-east', label: 'US East' }],
  remote: { remoteName: 'cluster-a' },
};

describe('MonitorDetailsPanel', () => {
  it('renders SO-only sections (Enabled, Last modified, Frequency) for a local monitor', () => {
    render(<MonitorDetailsPanel monitor={localMonitor} loading={false} configId="config-1" />);

    expect(screen.getByTestId('monitorEnabledStub')).toBeInTheDocument();
    expect(screen.getByText(/Last modified/i)).toBeInTheDocument();
    expect(screen.getByText(/Frequency/i)).toBeInTheDocument();
  });

  it('hides SO-only sections for a remote monitor (no saved object on this cluster)', () => {
    render(<MonitorDetailsPanel monitor={remoteMonitor} loading={false} configId="config-1" />);

    expect(screen.queryByTestId('monitorEnabledStub')).not.toBeInTheDocument();
    expect(screen.queryByText(/Last modified/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Frequency/i)).not.toBeInTheDocument();
  });

  it('renders common sections (Monitor ID, Monitor type, Locations, Tags) for a remote monitor', () => {
    render(<MonitorDetailsPanel monitor={remoteMonitor} loading={false} configId="config-1" />);

    expect(screen.getByText('config-1')).toBeInTheDocument();
    expect(screen.getByTestId('locationsStatusStub')).toBeInTheDocument();
    expect(screen.getByTestId('tagsListStub')).toHaveTextContent('env:prod');
  });
});
