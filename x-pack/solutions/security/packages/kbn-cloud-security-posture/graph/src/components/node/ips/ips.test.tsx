/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Ips } from './ips';

const TEST_SUBJ_TEXT = 'ips-text';
const TEST_SUBJ_TOOLTIP = 'ips-tooltip';
const TEST_SUBJ_PLUS_COUNT = 'ips-plus-count';
const TEST_SUBJ_TOOLTIP_CONTENT = 'ips-plus-tooltip-content';

describe('Ips', () => {
  test('renders nothing when input is undefined', () => {
    const { container } = render(<Ips />);
    expect(container.firstChild).toBe(null);
  });

  test('renders nothing when input array is empty', () => {
    const { container } = render(<Ips ips={[]} />);
    expect(container.firstChild).toBe(null);
  });

  test('renders a single IP correctly', () => {
    const testIp = '192.168.1.1';
    render(<Ips ips={[testIp]} />);

    expect(screen.getByTestId(TEST_SUBJ_TEXT)).toHaveTextContent(`${'IP: '}${testIp}`);
    expect(screen.queryByTestId(TEST_SUBJ_PLUS_COUNT)).not.toBeInTheDocument();
  });

  test('renders multiple IPs with a counter', () => {
    const testIps = ['192.168.1.1', '10.0.0.1', '172.16.0.1'];
    render(<Ips ips={testIps} />);

    expect(screen.getByTestId(TEST_SUBJ_TEXT)).toHaveTextContent(`${'IP: '}${testIps[0]}`);
    expect(screen.getByTestId(TEST_SUBJ_PLUS_COUNT)).toHaveTextContent('+2');
  });

  test('shows tooltip with all IPs', async () => {
    const testIps = ['192.168.1.1', '10.0.0.1', '172.16.0.1'];
    render(<Ips ips={testIps} />);

    expect(screen.queryByTestId(TEST_SUBJ_TOOLTIP_CONTENT)).not.toBeInTheDocument();
    expect(screen.getByTestId(TEST_SUBJ_TEXT)).toHaveTextContent(`${'IP: '}${testIps[0]}`);
    fireEvent.mouseOver(screen.getByTestId(TEST_SUBJ_TEXT));

    await waitFor(() => {
      expect(screen.getByTestId(TEST_SUBJ_TOOLTIP_CONTENT)).toBeInTheDocument();
    });

    const tooltipIps = screen.getAllByTestId('ips-tooltip-ip').map((ip) => ip.textContent);
    expect(tooltipIps).toEqual(testIps);
  });

  test('shows tooltip with all IPs and number of repetitions when some appear multiple times', async () => {
    const testIps = [
      '10.0.0.1',
      '172.16.0.1',
      '192.168.1.1',
      '10.0.0.1',
      '192.168.1.1',
      '192.168.1.1',
    ];
    render(<Ips ips={testIps} />);

    expect(screen.queryByTestId(TEST_SUBJ_TOOLTIP_CONTENT)).not.toBeInTheDocument();
    expect(screen.getByTestId(TEST_SUBJ_TEXT)).toHaveTextContent(`${'IP: '}${testIps[0]}`);
    fireEvent.mouseOver(screen.getByTestId(TEST_SUBJ_TEXT));

    await waitFor(() => {
      expect(screen.getByTestId(TEST_SUBJ_TOOLTIP_CONTENT)).toBeInTheDocument();
    });

    const tooltipIps = screen.getAllByTestId('ips-tooltip-ip').map((ip) => ip.textContent);
    expect(tooltipIps).toEqual(['2x: 10.0.0.1', '172.16.0.1', '3x: 192.168.1.1']);
  });

  test('renders tooltip with correct title', async () => {
    const testIps = ['192.168.1.1', '10.0.0.1', '172.16.0.1'];
    render(<Ips ips={testIps} />);

    fireEvent.mouseOver(screen.getByTestId(TEST_SUBJ_TEXT));

    await waitFor(() => {
      expect(screen.getByTestId(TEST_SUBJ_TOOLTIP_CONTENT)).toBeInTheDocument();
    });

    const tooltipContent = screen.getByTestId(TEST_SUBJ_TOOLTIP);
    expect(tooltipContent).toHaveTextContent('IP Addresses');
  });
});