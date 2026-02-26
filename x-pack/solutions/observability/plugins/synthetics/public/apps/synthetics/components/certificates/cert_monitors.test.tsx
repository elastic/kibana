/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent } from '@testing-library/react';
import { CertMonitors } from './cert_monitors';
import { render } from '../../utils/testing';
import type { CertMonitor } from '../../../../../common/runtime_types';

const createMockMonitors = (count: number): CertMonitor[] =>
  Array.from({ length: count }, (_, i) => ({
    name: `Monitor ${i + 1}`,
    id: `monitor-${i + 1}`,
    configId: `config-${i + 1}`,
    url: `https://example-${i + 1}.com`,
  }));

describe('CertMonitors', () => {
  it('renders all monitors when count is within the default limit', () => {
    const monitors = createMockMonitors(5);
    const { getByText, queryByTestId } = render(<CertMonitors monitors={monitors} />);

    for (const mon of monitors) {
      expect(getByText(mon.name!)).toBeInTheDocument();
    }
    expect(queryByTestId('certMonitorsViewAll')).not.toBeInTheDocument();
    expect(queryByTestId('certMonitorsShowFewer')).not.toBeInTheDocument();
  });

  it('renders exactly 10 monitors when count is at the default limit', () => {
    const monitors = createMockMonitors(10);
    const { getByText, queryByTestId } = render(<CertMonitors monitors={monitors} />);

    expect(getByText('Monitor 1')).toBeInTheDocument();
    expect(getByText('Monitor 10')).toBeInTheDocument();
    expect(queryByTestId('certMonitorsViewAll')).not.toBeInTheDocument();
    expect(queryByTestId('certMonitorsShowFewer')).not.toBeInTheDocument();
  });

  it('truncates monitors and shows "+N more" when count exceeds the default limit', () => {
    const monitors = createMockMonitors(100);
    const { getByText, queryByText, getByTestId, queryByTestId } = render(
      <CertMonitors monitors={monitors} />
    );

    expect(getByText('Monitor 1')).toBeInTheDocument();
    expect(getByText('Monitor 10')).toBeInTheDocument();
    expect(queryByText('Monitor 11')).not.toBeInTheDocument();
    expect(getByTestId('certMonitorsViewAll')).toHaveTextContent('+90 more');
    expect(queryByTestId('certMonitorsShowFewer')).not.toBeInTheDocument();
  });

  it('shows all monitors after clicking "+N more"', () => {
    const monitors = createMockMonitors(15);
    const { getByText, getByTestId, queryByTestId } = render(<CertMonitors monitors={monitors} />);

    fireEvent.click(getByTestId('certMonitorsViewAll'));

    expect(getByText('Monitor 10')).toBeInTheDocument();
    expect(getByText('Monitor 15')).toBeInTheDocument();
    expect(queryByTestId('certMonitorsViewAll')).not.toBeInTheDocument();
    expect(getByTestId('certMonitorsShowFewer')).toBeInTheDocument();
  });

  it('collapses back to 10 monitors after clicking "Show fewer"', () => {
    const monitors = createMockMonitors(15);
    const { queryByText, getByTestId } = render(<CertMonitors monitors={monitors} />);

    fireEvent.click(getByTestId('certMonitorsViewAll'));
    fireEvent.click(getByTestId('certMonitorsShowFewer'));

    expect(queryByText('Monitor 11')).not.toBeInTheDocument();
    expect(getByTestId('certMonitorsViewAll')).toHaveTextContent('+5 more');
  });
});
