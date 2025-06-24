/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '../../../utils/testing/rtl_helpers';
import { ActionMenuContent } from './action_menu_content';

describe('ActionMenuContent', () => {
  it('renders settings link', () => {
    const { getByRole, getByText } = render(<ActionMenuContent />);

    const settingsAnchor = getByRole('link', { name: 'Navigate to the Synthetics settings page' });
    expect(settingsAnchor.getAttribute('href')).toBe('/settings');
    expect(getByText('Settings'));
  });

  it('renders exploratory view link', () => {
    const { getByLabelText, getByText } = render(<ActionMenuContent />);

    const analyzeAnchor = getByLabelText(
      'Navigate to the "Explore Data" view to visualize Synthetics/User data'
    );

    expect(analyzeAnchor.getAttribute('href')).toContain('/app/exploratory-view');
    expect(getByText('Explore data'));
  });
});
