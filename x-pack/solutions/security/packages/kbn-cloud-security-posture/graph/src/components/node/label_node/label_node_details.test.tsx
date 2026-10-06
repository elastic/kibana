/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

import { LabelNodeDetails } from './label_node_details';
import { GRAPH_IPS_TEXT_ID, GRAPH_IPS_PLUS_COUNT_ID, GRAPH_FLAGS_BADGE_ID } from '../../test_ids';

describe('LabelNodeDetails', () => {
  test('renders empty div when no props are provided', () => {
    const { container } = render(<LabelNodeDetails />);
    expect(container.firstChild).toBeNull();
  });

  test('renders empty div when empty arrays are provided', () => {
    const { container } = render(<LabelNodeDetails ips={[]} countryCodes={[]} />);
    expect(container.firstChild).toBeNull();
  });

  test('renders Ips component when ips are provided', () => {
    const ips = ['192.168.1.1', '10.0.0.1'];
    const { container } = render(<LabelNodeDetails ips={ips} />);

    // Check that the IPs label is shown
    const ipsElement = screen.getByTestId(GRAPH_IPS_TEXT_ID);
    expect(ipsElement).toBeInTheDocument();

    // Multiple IPs: first IP value is hidden, only the +N badge is shown
    expect(screen.queryByText(ips[0])).not.toBeInTheDocument();
    expect(screen.getByTestId(GRAPH_IPS_PLUS_COUNT_ID)).toBeInTheDocument();
    expect(screen.getByTestId(GRAPH_IPS_PLUS_COUNT_ID)).toHaveTextContent(`+${ips.length}`);

    // Check that the country flags are not rendered
    expect(container.querySelectorAll(`[data-test-subj="${GRAPH_FLAGS_BADGE_ID}"]`).length).toBe(0);
  });

  test('renders CountryFlags component when countryCodes are provided', () => {
    const countryCodes = ['US', 'CA'];
    const { container } = render(<LabelNodeDetails countryCodes={countryCodes} />);

    // Check that the country flags badge is shown
    const flagsElement = screen.getByTestId(GRAPH_FLAGS_BADGE_ID);
    expect(flagsElement).toBeInTheDocument();

    // The badge should contain the flag emojis
    expect(flagsElement.textContent).toContain('🇺🇸');
    expect(flagsElement.textContent).toContain('🇨🇦');

    // Check that the IPs are not rendered
    expect(container.querySelectorAll(`[data-test-subj="${GRAPH_IPS_TEXT_ID}"]`).length).toBe(0);
  });

  test('renders both components when both props are provided', () => {
    const ips = ['192.168.1.1', '10.0.0.1'];
    const countryCodes = ['US', 'CA'];
    render(<LabelNodeDetails ips={ips} countryCodes={countryCodes} />);

    // Check that the IPs label is shown; multiple IPs show only the +N badge, not the first value
    const ipsElement = screen.getByTestId(GRAPH_IPS_TEXT_ID);
    expect(ipsElement).toBeInTheDocument();
    expect(screen.queryByText(ips[0])).not.toBeInTheDocument();
    expect(screen.getByTestId(GRAPH_IPS_PLUS_COUNT_ID)).toHaveTextContent(`+${ips.length}`);

    // Check that the country flags badge is shown
    const flagsElement = screen.getByTestId(GRAPH_FLAGS_BADGE_ID);
    expect(flagsElement).toBeInTheDocument();
  });
});
