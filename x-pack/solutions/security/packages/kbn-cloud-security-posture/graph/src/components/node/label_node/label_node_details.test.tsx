/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

import { LabelNodeDetails } from './label_node_details';
import { TEST_SUBJ_TEXT, TEST_SUBJ_PLUS_COUNT } from '../ips/ips';
import { TEST_SUBJ_BADGE } from '../country_flags/country_flags';

describe('LabelNodeDetails', () => {
  test('renders empty div when no props are provided', () => {
    const { container } = render(<LabelNodeDetails />);
    expect(container.firstChild).toBeEmptyDOMElement();
  });

  test('renders empty div when empty arrays are provided', () => {
    const { container } = render(<LabelNodeDetails ips={[]} countryCodes={[]} />);
    expect(container.firstChild).toBeEmptyDOMElement();
  });

  test('renders Ips component when ips are provided', () => {
    const ips = ['192.168.1.1', '10.0.0.1'];
    const { container } = render(<LabelNodeDetails ips={ips} />);

    // Check that the IPs text is shown
    const ipsElement = screen.getByTestId(TEST_SUBJ_TEXT);
    expect(ipsElement).toBeInTheDocument();
    expect(ipsElement.textContent).toContain(ips[0]); // Only first IP is shown by default

    // If there are multiple IPs, there should be a "+1" indicator
    if (ips.length > 1) {
      expect(screen.getByTestId(TEST_SUBJ_PLUS_COUNT)).toBeInTheDocument();
    }

    // Check that the country flags are not rendered
    expect(container.querySelectorAll(`[data-test-subj="${TEST_SUBJ_BADGE}"]`).length).toBe(0);
  });

  test('renders CountryFlags component when countryCodes are provided', () => {
    const countryCodes = ['US', 'CA'];
    const { container } = render(<LabelNodeDetails countryCodes={countryCodes} />);

    // Check that the country flags badge is shown
    const flagsElement = screen.getByTestId(TEST_SUBJ_BADGE);
    expect(flagsElement).toBeInTheDocument();

    // The badge should contain the flag emojis
    expect(flagsElement.textContent).toContain('🇺🇸');
    expect(flagsElement.textContent).toContain('🇨🇦');

    // Check that the IPs are not rendered
    expect(container.querySelectorAll(`[data-test-subj="${TEST_SUBJ_TEXT}"]`).length).toBe(0);
  });

  test('renders both components when both props are provided', () => {
    const ips = ['192.168.1.1', '10.0.0.1'];
    const countryCodes = ['US', 'CA'];
    render(<LabelNodeDetails ips={ips} countryCodes={countryCodes} />);

    // Check that the IPs text is shown
    const ipsElement = screen.getByTestId(TEST_SUBJ_TEXT);
    expect(ipsElement).toBeInTheDocument();
    expect(ipsElement.textContent).toContain(ips[0]); // Only first IP is shown by default

    // Check that the country flags badge is shown
    const flagsElement = screen.getByTestId(TEST_SUBJ_BADGE);
    expect(flagsElement).toBeInTheDocument();
  });
});
