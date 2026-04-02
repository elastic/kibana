/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { ALERT_EPISODE_STATUS } from '@kbn/alerting-v2-schemas';
import { render } from '../../../utils/test_helper';
import { useKibana } from '../../../utils/kibana_react';
import { kibanaStartMock } from '../../../utils/kibana_react.mock';
import { EpisodeLifecycleHeatmap } from './episode_lifecycle_heatmap';

jest.mock('../../../utils/kibana_react');

const useKibanaMock = useKibana as jest.Mock;

describe('EpisodeLifecycleHeatmap', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useKibanaMock.mockReturnValue(kibanaStartMock.startContract());
  });

  it('renders empty state when there are no events', () => {
    render(<EpisodeLifecycleHeatmap eventRows={[]} />);

    expect(screen.getByTestId('observabilityEpisodeLifecycleHeatmapEmpty')).toBeInTheDocument();
    expect(screen.getByText('No events in this episode yet')).toBeInTheDocument();
  });

  it('renders the heatmap when event rows are present', () => {
    render(
      <EpisodeLifecycleHeatmap
        eventRows={[
          {
            '@timestamp': '2024-01-01T00:00:00.000Z',
            'episode.status': ALERT_EPISODE_STATUS.ACTIVE,
          },
        ]}
      />
    );

    expect(screen.getByTestId('observabilityEpisodeLifecycleHeatmap')).toBeInTheDocument();
    expect(screen.getByText('Episode timeline')).toBeInTheDocument();
  });
});
