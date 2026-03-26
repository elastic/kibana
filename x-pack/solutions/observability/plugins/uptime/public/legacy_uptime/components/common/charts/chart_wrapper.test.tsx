/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import { ChartWrapper } from './chart_wrapper';
import { SnapshotHeading } from '../../overview/snapshot/snapshot_heading';
import { DonutChart } from './donut_chart';
import { mockCore } from '../../../lib/helper/rtl_helpers';
import { render } from '@testing-library/react';
const SNAPSHOT_CHART_HEIGHT = 144;

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: jest.fn().mockImplementation(() => ({
    services: mockCore(),
  })),
}));

describe('ChartWrapper component', () => {
  it('renders the component with loading false', () => {
    const { getByTestId, getByRole, queryByRole } = render(
      <ChartWrapper loading={false}>
        <SnapshotHeading total={12} />
        <EuiSpacer size="xs" />
        <DonutChart up={4} down={8} height={SNAPSHOT_CHART_HEIGHT} />
      </ChartWrapper>
    );
    const headline = getByRole('heading');
    expect(headline.textContent).toBe('12 Monitors');

    const downIndicatorLabel = getByTestId('xpack.synthetics.snapshot.donutChart.down.label');
    const downIndicator = getByTestId('xpack.synthetics.snapshot.donutChart.down');
    expect(downIndicatorLabel.textContent).toBe('Down');
    expect(downIndicator.textContent).toBe('8');

    const upIndicatorLabel = getByTestId('xpack.synthetics.snapshot.donutChart.up.label');
    const upIndicator = getByTestId('xpack.synthetics.snapshot.donutChart.up');
    expect(upIndicatorLabel.textContent).toBe('Up');
    expect(upIndicator.textContent).toBe('4');

    expect(queryByRole('progressbar')).toBeNull();
  });

  it('renders the component with loading true', () => {
    const { getByRole, getByTestId } = render(
      <ChartWrapper loading={true}>
        <SnapshotHeading total={12} />
        <EuiSpacer size="xs" />
        <DonutChart up={4} down={8} height={SNAPSHOT_CHART_HEIGHT} />
      </ChartWrapper>
    );
    const headline = getByRole('heading');
    expect(headline.textContent).toBe('12 Monitors');

    const downIndicatorLabel = getByTestId('xpack.synthetics.snapshot.donutChart.down.label');
    const downIndicator = getByTestId('xpack.synthetics.snapshot.donutChart.down');
    expect(downIndicatorLabel.textContent).toBe('Down');
    expect(downIndicator.textContent).toBe('8');

    const upIndicatorLabel = getByTestId('xpack.synthetics.snapshot.donutChart.up.label');
    const upIndicator = getByTestId('xpack.synthetics.snapshot.donutChart.up');
    expect(upIndicatorLabel.textContent).toBe('Up');
    expect(upIndicator.textContent).toBe('4');

    const progressBar = getByRole('progressbar');
    expect(progressBar).toBeInTheDocument();
  });
});
