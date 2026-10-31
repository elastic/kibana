/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TestProviders } from '../../../common/mock';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { AssetCriticalityAccordion, AssetCriticalitySelector } from './asset_criticality_selector';
import type { State } from './use_asset_criticality';
import { useAssetCriticalityData, useAssetCriticalityPrivileges } from './use_asset_criticality';
import { EntityType } from '../../../../common/entity_analytics/types';

jest.mock('./use_asset_criticality');

const criticality = {
  status: 'create',
  query: {},
  privileges: {
    data: {
      has_write_permissions: true,
    },
  },
  mutation: {},
} as State;

describe('AssetCriticalitySelector', () => {
  it('renders', () => {
    const { getByTestId } = render(
      <AssetCriticalitySelector
        criticality={criticality}
        entity={{
          type: EntityType.host,
          name: 'My test Host',
        }}
      />,
      {
        wrapper: TestProviders,
      }
    );

    expect(getByTestId('asset-criticality-selector')).toBeInTheDocument();
  });

  it('renders when compressed', () => {
    const { getByTestId } = render(
      <AssetCriticalitySelector
        criticality={criticality}
        entity={{
          type: EntityType.host,
          name: 'My test Host',
        }}
        compressed
      />,
      {
        wrapper: TestProviders,
      }
    );

    expect(getByTestId('asset-criticality-change-btn')).toHaveAttribute(
      'aria-label',
      'Change asset criticality'
    );
  });
});

describe('AssetCriticalityAccordion', () => {
  beforeEach(() => {
    (useAssetCriticalityPrivileges as jest.Mock).mockReturnValue({
      isLoading: false,
      data: { has_read_permissions: true, has_write_permissions: true },
    });
    (useAssetCriticalityData as jest.Mock).mockReturnValue(criticality);
  });

  it('renders the info tooltip trigger outside the accordion toggle button', () => {
    render(<AssetCriticalityAccordion entity={{ type: EntityType.host, name: 'My test Host' }} />, {
      wrapper: TestProviders,
    });

    const toggleButton = screen.getByRole('button', { name: 'Asset Criticality' });
    const infoTrigger = screen.getByTestId('asset-criticality-info-tooltip');

    expect(infoTrigger).toHaveAttribute('tabindex', '0');
    expect(toggleButton).not.toContainElement(infoTrigger);
  });
});
