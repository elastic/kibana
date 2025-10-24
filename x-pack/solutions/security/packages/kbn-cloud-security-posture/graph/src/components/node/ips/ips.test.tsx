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

  test('renders a single IP correctly', () => {
    const testIp = '192.168.1.1';
    render(<Ips ips={[testIp]} />);

    expect(screen.getByTestId(GRAPH_IPS_TEXT_ID)).toHaveTextContent(`${'IP: '}${testIp}`);
    expect(screen.queryByTestId(GRAPH_IPS_PLUS_COUNT_ID)).not.toBeInTheDocument();
    expect(screen.queryByTestId(GRAPH_IPS_PLUS_COUNT_BUTTON_ID)).not.toBeInTheDocument();
  });

  test('renders multiple IPs with a counter', () => {
    const testIps = ['192.168.1.1', '10.0.0.1', '172.16.0.1'];
    render(<Ips ips={testIps} />);

    expect(screen.getByTestId(GRAPH_IPS_TEXT_ID)).toHaveTextContent(`${'IP: '}${testIps[0]}`);
    expect(screen.getByTestId(GRAPH_IPS_PLUS_COUNT_ID)).toHaveTextContent('+2');
    expect(screen.queryByTestId(GRAPH_IPS_PLUS_COUNT_BUTTON_ID)).not.toBeInTheDocument();
  });

  test('renders aria-label in focusable button', () => {
    const testIps = ['192.168.1.1', '10.0.0.1', '172.16.0.1'];
    render(<Ips ips={testIps} onIpClick={mockOnIpClick} />);

    const popoverButton = screen.getByRole('button');
    expect(popoverButton).toHaveAccessibleName('Show IP address details');
  });

  describe('popover', () => {
    test('calls onIpClick when counter button is clicked', async () => {
      const testIps = ['192.168.1.1', '10.0.0.1', '172.16.0.1'];
      render(<Ips ips={testIps} onIpClick={mockOnIpClick} />);

      const counterButton = screen.getByTestId(GRAPH_IPS_PLUS_COUNT_BUTTON_ID);
      await userEvent.click(counterButton);

      expect(mockOnIpClick).toHaveBeenCalledTimes(1);
    });

    test('does not render counter button for single IP', () => {
      const testIps = ['192.168.1.1'];
      render(<Ips ips={testIps} onIpClick={mockOnIpClick} />);

      expect(screen.queryByTestId(GRAPH_IPS_PLUS_COUNT_BUTTON_ID)).not.toBeInTheDocument();
    });

    test('does not call onIpClick when onIpClick is not provided', async () => {
      const testIps = ['192.168.1.1', '10.0.0.1', '172.16.0.1'];
      render(<Ips ips={testIps} />);

      const counterButton = screen.queryByTestId(GRAPH_IPS_PLUS_COUNT_BUTTON_ID);
      expect(counterButton).not.toBeInTheDocument();
    });
  });
});
