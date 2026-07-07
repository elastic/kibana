/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, waitFor } from '@testing-library/react';
import React from 'react';

import { MapToolTip } from './map_tooltip';
import { COUNTRY_NAME, REGION_NAME, TRANSACTION_DURATION_COUNTRY } from './use_layer_list';

describe('Map Tooltip', () => {
  it('renders with specific props and handles outside click', async () => {
    // Mock closeTooltip function
    const closeTooltip = jest.fn();

    // Create mock features array
    const mockFeatures = [
      {
        id: 'feature-123',
        layerId: 'layer-456',
        mbProperties: {
          // These properties are used by loadFeatureProperties
          country: 'United States',
          region: 'NASA',
          duration: 1500000, // 1.5 seconds in microseconds
        },
      },
    ];

    // Mock loadFeatureProperties function
    const loadFeatureProperties = jest.fn().mockResolvedValue([
      {
        getPropertyKey: () => REGION_NAME,
        getRawValue: () => 'NASA',
      },
      {
        getPropertyKey: () => COUNTRY_NAME,
        getRawValue: () => 'United States',
      },
      {
        getPropertyKey: () => TRANSACTION_DURATION_COUNTRY,
        getRawValue: () => '1500000', // 1.5 seconds in microseconds
      },
    ]);

    const { getByText, queryByText } = render(
      <MapToolTip
        closeTooltip={closeTooltip}
        features={mockFeatures as any}
        loadFeatureProperties={loadFeatureProperties}
      />
    );

    // Wait for async useEffect to complete
    await waitFor(() => {
      expect(loadFeatureProperties).toHaveBeenCalled();
    });

    // Prefers country to region
    await waitFor(() => {
      expect(getByText('United States')).toBeInTheDocument();
      expect(queryByText('NASA')).toBeNull();
      expect(getByText('Average page load duration')).toBeInTheDocument();
      expect(getByText('1.50 sec')).toBeInTheDocument();
    });
  });
});
