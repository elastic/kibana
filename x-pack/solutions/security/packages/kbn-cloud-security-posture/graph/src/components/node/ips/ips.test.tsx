/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  GRAPH_IPS_TEXT_ID,
  GRAPH_IPS_PLUS_COUNT_ID,
  GRAPH_IPS_PLUS_COUNT_BUTTON_ID,
  GRAPH_IPS_BUTTON_ID,
  GRAPH_IPS_VALUE_ID,
} from '../../test_ids';
import { Ips } from './ips';

describe('Ips', () => {
  const mockOnIpClick = jest.fn();

  beforeEach(() => {
    mockOnIpClick.mockClear();
  });

  test('renders nothing when input array is empty', () => {
    const { container } = render(<Ips ips={[]} />);
    expect(container.firstChild).toBeNull();
  });

  test('renders a single IP correctly without onIpClick', () => {
    const testIp = '192.168.1.1';
    render(<Ips ips={[testIp]} />);

    expect(screen.getByTestId(GRAPH_IPS_TEXT_ID)).toHaveTextContent('IP:');
    expect(screen.getByTestId(GRAPH_IPS_VALUE_ID)).toHaveTextContent(testIp);
    expect(screen.queryByTestId(GRAPH_IPS_BUTTON_ID)).not.toBeInTheDocument();
    expect(screen.queryByTestId(GRAPH_IPS_PLUS_COUNT_ID)).not.toBeInTheDocument();
    expect(screen.queryByTestId(GRAPH_IPS_PLUS_COUNT_BUTTON_ID)).not.toBeInTheDocument();
  });

  test('renders a single IP correctly with onIpClick', () => {
    const testIps = ['192.168.1.1'];
    render(<Ips ips={testIps} onIpClick={mockOnIpClick} />);

    expect(screen.getByTestId(GRAPH_IPS_TEXT_ID)).toHaveTextContent('IP:');
    expect(screen.getByTestId(GRAPH_IPS_BUTTON_ID)).toHaveTextContent(testIps[0]);
    expect(screen.queryByTestId(GRAPH_IPS_PLUS_COUNT_ID)).not.toBeInTheDocument();
    expect(screen.queryByTestId(GRAPH_IPS_PLUS_COUNT_BUTTON_ID)).not.toBeInTheDocument();
  });

  test('renders multiple IPs with a counter when onIpClick is not provided', () => {
    const testIps = ['192.168.1.1', '10.0.0.1', '172.16.0.1'];
    render(<Ips ips={testIps} />);

    expect(screen.getByTestId(GRAPH_IPS_TEXT_ID)).toHaveTextContent('IP:');
    expect(screen.getByTestId(GRAPH_IPS_VALUE_ID)).toHaveTextContent(testIps[0]);
    expect(screen.getByTestId(GRAPH_IPS_PLUS_COUNT_ID)).toHaveTextContent('+2');
    expect(screen.queryByTestId(GRAPH_IPS_PLUS_COUNT_BUTTON_ID)).not.toBeInTheDocument();
  });

  test('renders multiple IPs with a counter when onIpClick is provided', () => {
    const testIps = ['192.168.1.1', '10.0.0.1', '172.16.0.1'];
    render(<Ips ips={testIps} onIpClick={mockOnIpClick} />);

    expect(screen.getByTestId(GRAPH_IPS_TEXT_ID)).toHaveTextContent('IP:');
    expect(screen.getByTestId(GRAPH_IPS_VALUE_ID)).toHaveTextContent(testIps[0]);
    expect(screen.getByTestId(GRAPH_IPS_PLUS_COUNT_BUTTON_ID)).toHaveTextContent('+2');
    expect(screen.queryByTestId(GRAPH_IPS_PLUS_COUNT_ID)).not.toBeInTheDocument();
  });

  test('renders aria-label in focusable button for single IP when onIpClick is provided', () => {
    const testIps = ['192.168.1.1'];
    render(<Ips ips={testIps} onIpClick={mockOnIpClick} />);

    const popoverButton = screen.getByTestId(GRAPH_IPS_BUTTON_ID);
    expect(popoverButton).toHaveAccessibleName('Show IP address details');
  });

  test('renders aria-label in counter button for multiple IPs', () => {
    const testIps = ['192.168.1.1', '10.0.0.1', '172.16.0.1'];
    render(<Ips ips={testIps} onIpClick={mockOnIpClick} />);

    const counterButton = screen.getByTestId(GRAPH_IPS_PLUS_COUNT_BUTTON_ID);
    expect(counterButton).toHaveAccessibleName('Show IP address details');
  });

  describe('click behavior', () => {
    describe('single IP', () => {
      test('clicking single IP button calls onIpClick prop when provided', async () => {
        const testIp = '192.168.1.1';
        render(<Ips ips={[testIp]} onIpClick={mockOnIpClick} />);

        const ipButton = screen.getByTestId(GRAPH_IPS_BUTTON_ID);
        await userEvent.click(ipButton);

        expect(mockOnIpClick).toHaveBeenCalledTimes(1);
      });

      test('single IP button is not clickable when onIpClick is not provided', async () => {
        const testIp = '192.168.1.1';
        render(<Ips ips={[testIp]} />);

        // When onIpClick is not provided, single IP should render as text, not button
        expect(screen.queryByTestId(GRAPH_IPS_BUTTON_ID)).not.toBeInTheDocument();
        expect(screen.getByTestId(GRAPH_IPS_VALUE_ID)).toHaveTextContent(testIp);
      });
    });

    describe('multiple IPs', () => {
      test('first IP is rendered as text (not clickable) when there are multiple IPs', () => {
        const testIps = ['192.168.1.1', '10.0.0.1', '172.16.0.1'];
        render(<Ips ips={testIps} onIpClick={mockOnIpClick} />);

        // First IP should be plain text, not a button
        expect(screen.queryByTestId(GRAPH_IPS_BUTTON_ID)).not.toBeInTheDocument();
        expect(screen.getByTestId(GRAPH_IPS_VALUE_ID)).toHaveTextContent(testIps[0]);
      });

      test('clicking counter button calls onIpClick when provided', async () => {
        const testIps = ['192.168.1.1', '10.0.0.1', '172.16.0.1'];
        render(<Ips ips={testIps} onIpClick={mockOnIpClick} />);

        const counterButton = screen.getByTestId(GRAPH_IPS_PLUS_COUNT_BUTTON_ID);
        await userEvent.click(counterButton);

        expect(mockOnIpClick).toHaveBeenCalledTimes(1);
      });

      test('counter is rendered as text (not clickable) when onIpClick is not provided', () => {
        const testIps = ['192.168.1.1', '10.0.0.1', '172.16.0.1'];
        render(<Ips ips={testIps} />);

        expect(screen.queryByTestId(GRAPH_IPS_PLUS_COUNT_BUTTON_ID)).not.toBeInTheDocument();
        expect(screen.getByTestId(GRAPH_IPS_PLUS_COUNT_ID)).toBeInTheDocument();
        expect(screen.getByTestId(GRAPH_IPS_PLUS_COUNT_ID)).toHaveTextContent('+2');
      });
    });
  });
});
