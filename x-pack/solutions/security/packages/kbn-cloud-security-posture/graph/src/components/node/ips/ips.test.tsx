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
  GRAPH_IPS_TEXT_ID,
  GRAPH_IPS_PLUS_COUNT_ID,
  GRAPH_IPS_TOOLTIP_CONTENT_ID,
  GRAPH_IPS_TOOLTIP_IP_ID,
} from '../../test_ids';
import { Ips, MAX_IPS_IN_TOOLTIP } from './ips';

describe('Ips', () => {
  test('renders nothing when input array is empty', () => {
    const { container } = render(<Ips ips={[]} />);
    expect(container.firstChild).toBeNull();
  });

  test('renders a single IP correctly', () => {
    const testIp = '192.168.1.1';
    render(<Ips ips={[testIp]} />);

    expect(screen.getByTestId(GRAPH_IPS_TEXT_ID)).toHaveTextContent(`${'IP: '}${testIp}`);
    expect(screen.queryByTestId(GRAPH_IPS_PLUS_COUNT_ID)).not.toBeInTheDocument();
  });

  test('renders multiple IPs with a counter', () => {
    const testIps = ['192.168.1.1', '10.0.0.1', '172.16.0.1'];
    render(<Ips ips={testIps} />);

    expect(screen.getByTestId(GRAPH_IPS_TEXT_ID)).toHaveTextContent(`${'IP: '}${testIps[0]}`);
    expect(screen.getByTestId(GRAPH_IPS_PLUS_COUNT_ID)).toHaveTextContent('+2');
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

      expect(screen.queryByTestId(GRAPH_IPS_TOOLTIP_CONTENT_ID)).not.toBeInTheDocument();
      await userEvent.hover(screen.getByTestId(GRAPH_IPS_TEXT_ID));

      await waitFor(() => {
        expect(screen.queryByTestId(GRAPH_IPS_TOOLTIP_CONTENT_ID)).not.toBeInTheDocument();
      });
    });

    test('renders tooltip with multiple unique IPs', async () => {
      const testIps = ['192.168.1.1', '10.0.0.1', '172.16.0.1'];
      render(<Ips ips={testIps} />);

      expect(screen.queryByTestId(GRAPH_IPS_TOOLTIP_CONTENT_ID)).not.toBeInTheDocument();
      expect(screen.getByTestId(GRAPH_IPS_TEXT_ID)).toHaveTextContent(`${'IP: '}${testIps[0]}`);
      await userEvent.hover(screen.getByTestId(GRAPH_IPS_TEXT_ID));

      await waitFor(() => {
        expect(screen.getByTestId(GRAPH_IPS_TOOLTIP_CONTENT_ID)).toBeInTheDocument();
      });

      const tooltipIps = screen.getAllByTestId(GRAPH_IPS_TOOLTIP_IP_ID).map((ip) => ip.textContent);
      expect(tooltipIps).toEqual(testIps);

      expect(screen.queryByTestId(GRAPH_IPS_TOOLTIP_CONTENT_ID)).not.toHaveTextContent(
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

      expect(screen.queryByTestId(GRAPH_IPS_TOOLTIP_CONTENT_ID)).not.toBeInTheDocument();
      expect(screen.getByTestId(GRAPH_IPS_TEXT_ID)).toHaveTextContent(`${'IP: '}${testIps[0]}`);
      await userEvent.hover(screen.getByTestId(GRAPH_IPS_TEXT_ID));

      await waitFor(() => {
        expect(screen.getByTestId(GRAPH_IPS_TOOLTIP_CONTENT_ID)).toBeInTheDocument();
      });

      const tooltipIps = screen.getAllByTestId(GRAPH_IPS_TOOLTIP_IP_ID).map((ip) => ip.textContent);

      expect(tooltipIps).toHaveLength(MAX_IPS_IN_TOOLTIP);
      expect(tooltipIps).toEqual(testIps.slice(0, MAX_IPS_IN_TOOLTIP));
    });
  });
});
