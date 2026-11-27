/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { InvalidMitreBadge } from './invalid_mitre_badge';

describe('InvalidMitreBadge', () => {
  it('links an ICS id to the attack.mitre.org ICS-shaped page', () => {
    render(<InvalidMitreBadge id="T0817" framework="ics" />);

    expect(screen.getByTestId('coverageOverviewInvalidMitreBadge-T0817')).toHaveAttribute(
      'href',
      'https://attack.mitre.org/techniques/T0817/'
    );
  });

  it('links an ATLAS id to atlas.mitre.org', () => {
    render(<InvalidMitreBadge id="AML.T0044" framework="atlas" />);

    expect(screen.getByTestId('coverageOverviewInvalidMitreBadge-AML.T0044')).toHaveAttribute(
      'href',
      expect.stringContaining('atlas.mitre.org')
    );
  });

  it('renders a plain badge when the id does not match the framework format', () => {
    render(<InvalidMitreBadge id="AML.T0044" framework="enterprise" />);

    expect(screen.getByTestId('coverageOverviewInvalidMitreBadge-AML.T0044')).not.toHaveAttribute(
      'href'
    );
  });
});
