/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

import {
  LabelNodeDetails,
  TEST_SUBJ_GEO_OVERFLOW,
  TEST_SUBJ_GEO_ROW,
  TEST_SUBJ_IP_OVERFLOW,
  TEST_SUBJ_IP_ROW,
  TEST_SUBJ_METADATA_ROW,
} from './label_node_details';

describe('LabelNodeDetails', () => {
  test('renders null when no props are provided', () => {
    const { container } = render(<LabelNodeDetails />);
    expect(container.firstChild).toBeNull();
  });

  test('renders null when empty arrays are provided', () => {
    const { container } = render(<LabelNodeDetails ips={[]} countryCodes={[]} />);
    expect(container.firstChild).toBeNull();
  });

  test('renders IP address metadata row when ips are provided', () => {
    render(<LabelNodeDetails ips={['192.168.1.1']} />);

    expect(screen.getByTestId(TEST_SUBJ_METADATA_ROW)).toBeInTheDocument();
    expect(screen.getByTestId(TEST_SUBJ_IP_ROW)).toBeInTheDocument();
    expect(screen.getByText('IP address')).toBeInTheDocument();
    expect(screen.queryByTestId(TEST_SUBJ_IP_OVERFLOW)).not.toBeInTheDocument();
  });

  test('renders IP overflow badge when multiple ips are provided', () => {
    render(<LabelNodeDetails ips={['192.168.1.1', '10.0.0.1', '172.16.0.1']} />);

    expect(screen.getByTestId(TEST_SUBJ_IP_OVERFLOW)).toHaveTextContent('+2');
  });

  test('renders geolocation metadata row when countryCodes are provided', () => {
    render(<LabelNodeDetails countryCodes={['US', 'CA']} />);

    expect(screen.getByTestId(TEST_SUBJ_GEO_ROW)).toBeInTheDocument();
    expect(screen.getByText('🇺🇸')).toBeInTheDocument();
    expect(screen.getByText('🇨🇦')).toBeInTheDocument();
  });

  test('renders geolocation overflow badge when more than two countries are provided', () => {
    render(<LabelNodeDetails countryCodes={['US', 'CA', 'RU', 'DE']} />);

    expect(screen.getByTestId(TEST_SUBJ_GEO_OVERFLOW)).toHaveTextContent('+2');
  });

  test('renders both metadata rows when ips and countryCodes are provided', () => {
    render(<LabelNodeDetails ips={['192.168.1.1', '10.0.0.1']} countryCodes={['US', 'CA']} />);

    expect(screen.getByTestId(TEST_SUBJ_IP_ROW)).toBeInTheDocument();
    expect(screen.getByTestId(TEST_SUBJ_GEO_ROW)).toBeInTheDocument();
    expect(screen.getByTestId(TEST_SUBJ_IP_OVERFLOW)).toHaveTextContent('+1');
  });
});
