/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  Ips,
  TEST_SUBJ_TEXT,
  TEST_SUBJ_PLUS_COUNT,
  TEST_SUBJ_TOOLTIP_CONTENT,
  TEST_SUBJ_TOOLTIP_IP,
  MAX_IPS_IN_TOOLTIP,
} from './ips';

describe('Ips', () => {
  test('renders nothing when input array is empty', () => {
    const { container } = render(<Ips ips={[]} />);
    expect(container.firstChild).toBeNull();
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

  test('renders aria-label in focusable button', () => {
    const testIps = ['192.168.1.1', '10.0.0.1', '172.16.0.1'];
    render(<Ips ips={testIps} />);

    const tooltipButton = screen.getByRole('button');
    expect(tooltipButton).toHaveAccessibleName('Show IP address details');
  });

  describe('tooltip', () => {
    test('does not render tooltip for a single IP', async () => {
      const testIps = ['192.168.1.1'];
      render(<Ips ips={testIps} />);

      expect(screen.queryByTestId(TEST_SUBJ_TOOLTIP_CONTENT)).not.toBeInTheDocument();
      await userEvent.hover(screen.getByTestId(TEST_SUBJ_TEXT));

      await waitFor(() => {
        expect(screen.queryByTestId(TEST_SUBJ_TOOLTIP_CONTENT)).not.toBeInTheDocument();
      });
    });

    test('renders tooltip with multiple unique IPs', async () => {
      const testIps = ['192.168.1.1', '10.0.0.1', '172.16.0.1'];
      render(<Ips ips={testIps} />);

      expect(screen.queryByTestId(TEST_SUBJ_TOOLTIP_CONTENT)).not.toBeInTheDocument();
      expect(screen.getByTestId(TEST_SUBJ_TEXT)).toHaveTextContent(`${'IP: '}${testIps[0]}`);
      await userEvent.hover(screen.getByTestId(TEST_SUBJ_TEXT));

      await waitFor(() => {
        expect(screen.getByTestId(TEST_SUBJ_TOOLTIP_CONTENT)).toBeInTheDocument();
      });

      const tooltipIps = screen.getAllByTestId(TEST_SUBJ_TOOLTIP_IP).map((ip) => ip.textContent);
      expect(tooltipIps).toEqual(testIps);

      expect(screen.queryByTestId(TEST_SUBJ_TOOLTIP_CONTENT)).not.toHaveTextContent(
        'Open full details in flyout'
      );
    });

    test('renders tooltip with max number of unique IPs', async () => {
      const baseIp = '192.168.1.';
      const testIps = [];
      for (let i = 1; i <= MAX_IPS_IN_TOOLTIP + 1; i++) {
        testIps.push(`${baseIp}${i}`);
      }

      render(<Ips ips={testIps} />);

      expect(screen.queryByTestId(TEST_SUBJ_TOOLTIP_CONTENT)).not.toBeInTheDocument();
      expect(screen.getByTestId(TEST_SUBJ_TEXT)).toHaveTextContent(`${'IP: '}${testIps[0]}`);
      await userEvent.hover(screen.getByTestId(TEST_SUBJ_TEXT));

      await waitFor(() => {
        expect(screen.getByTestId(TEST_SUBJ_TOOLTIP_CONTENT)).toBeInTheDocument();
      });

      const tooltipIps = screen.getAllByTestId(TEST_SUBJ_TOOLTIP_IP).map((ip) => ip.textContent);

      expect(tooltipIps).toHaveLength(MAX_IPS_IN_TOOLTIP);
      expect(tooltipIps).toEqual(testIps.slice(0, MAX_IPS_IN_TOOLTIP));
    });
  });
});
