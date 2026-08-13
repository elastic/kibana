/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useEuiTheme } from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useLocation } from 'react-router-dom-v5-compat';
import { useIntegrationTiles } from './use_integration_tiles';

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: jest.fn(),
}));

jest.mock('react-router-dom-v5-compat', () => ({
  useLocation: jest.fn(),
}));

jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  useEuiTheme: jest.fn(),
}));

const mockUseKibana = useKibana as jest.Mock;
const mockUseEuiTheme = useEuiTheme as jest.Mock;
const mockUseLocation = useLocation as jest.Mock;
const mockNavigateToApp = jest.fn();

describe('useIntegrationTiles', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseKibana.mockReturnValue({
      services: {
        application: {
          navigateToApp: mockNavigateToApp,
        },
        http: {
          staticAssets: {
            getPluginAssetHref: (path: string) => `/plugin/${path}`,
          },
        },
      },
    });
    mockUseEuiTheme.mockReturnValue({ colorMode: 'LIGHT' });
    mockUseLocation.mockReturnValue({ search: '?search=host' });
  });

  it('returns cards flagged as quickstart under the observability category', () => {
    const { result } = renderHook(() => useIntegrationTiles());
    expect(result.current[0]).toEqual(
      expect.objectContaining({
        id: expect.stringMatching(/^quickstart-/),
        categories: ['observability'],
        isQuickstart: true,
      })
    );
  });

  it('resolves logos to either EUI or SVG icon entries', () => {
    const { result } = renderHook(() => useIntegrationTiles());
    const awsCard = result.current.find((card) => card.name === 'aws');
    const linuxCard = result.current.find((card) => card.name === 'linux');
    expect(awsCard?.icons).toEqual([{ type: 'eui', src: 'logoAWS' }]);
    expect(linuxCard?.icons).toEqual([{ type: 'svg', src: '/plugin/linux.svg' }]);
  });

  it('navigates only host cards from search results', () => {
    const { result } = renderHook(() => useIntegrationTiles());
    const linuxCard = result.current.find((card) => card.name === 'linux');
    const kubernetesCard = result.current.find((card) => card.name === 'kubernetes');

    linuxCard?.onCardClick?.();
    kubernetesCard?.onCardClick?.();

    expect(mockNavigateToApp).toHaveBeenCalledTimes(1);
    expect(mockNavigateToApp).toHaveBeenCalledWith('onboarding', {
      path: '/host/linux?search=host',
    });
  });
});
