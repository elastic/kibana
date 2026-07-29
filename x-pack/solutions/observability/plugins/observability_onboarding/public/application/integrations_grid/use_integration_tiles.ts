/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useEuiTheme } from '@elastic/eui';
import type { HttpStart } from '@kbn/core-http-browser';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { IntegrationCardItem } from '@kbn/fleet-plugin/public';
import { useLocation } from 'react-router-dom-v5-compat';
import type { ObservabilityOnboardingAppServices } from '../..';
import { EUI_LOGO_BY_BRAND, type SupportedLogo } from '../shared/logo_icon';
import { INTEGRATION_TILES, type IntegrationTileData } from './integration_tiles';

const CLICKABLE_HOST_TILE_IDS = new Set(['linux', 'windows', 'macos']);

function resolveIcon(logo: SupportedLogo, http: HttpStart): IntegrationCardItem['icons'][number] {
  const euiIcon = EUI_LOGO_BY_BRAND[logo];
  return euiIcon
    ? { type: 'eui', src: euiIcon }
    : { type: 'svg', src: http.staticAssets.getPluginAssetHref(`${logo}.svg`) };
}

function createHostTileClickHandler(
  tile: IntegrationTileData,
  application: ObservabilityOnboardingAppServices['application'],
  search: string
): IntegrationCardItem['onCardClick'] {
  if (!tile.route || !CLICKABLE_HOST_TILE_IDS.has(tile.id)) {
    return () => {};
  }

  return () => {
    application.navigateToApp('onboarding', { path: `${tile.route}${search}` });
  };
}

export function useIntegrationTiles(): IntegrationCardItem[] {
  const {
    services: { application, http },
  } = useKibana<ObservabilityOnboardingAppServices>();
  const { colorMode } = useEuiTheme();
  const { search } = useLocation();

  return useMemo(() => {
    return INTEGRATION_TILES.flatMap((category) => category.tiles).map((tile) => {
      const resolvedLogo = colorMode === 'DARK' ? tile.darkLogo ?? tile.logo : tile.logo;
      return {
        id: `quickstart-${tile.id}`,
        name: tile.id,
        type: 'virtual',
        title: tile.title,
        description: tile.description,
        categories: ['observability'],
        icons: [resolveIcon(resolvedLogo, http)],
        url: '',
        version: '',
        integration: '',
        isQuickstart: true,
        onCardClick: createHostTileClickHandler(tile, application, search),
      } satisfies IntegrationCardItem;
    });
  }, [application, colorMode, http, search]);
}
