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
import type { ObservabilityOnboardingAppServices } from '../..';
import { EUI_LOGO_BY_BRAND, type SupportedLogo } from '../shared/logo_icon';
import { INTEGRATION_TILES } from './integration_tiles';

function resolveIcon(logo: SupportedLogo, http: HttpStart): IntegrationCardItem['icons'][number] {
  const euiIcon = EUI_LOGO_BY_BRAND[logo];
  return euiIcon
    ? { type: 'eui', src: euiIcon }
    : { type: 'svg', src: http.staticAssets.getPluginAssetHref(`${logo}.svg`) };
}

/**
 * Maps the curated INTEGRATION_TILES into Fleet IntegrationCardItem[] so they
 * can be rendered inside Fleet's PackageListGrid alongside Fleet packages.
 * The cards are flagged isQuickstart so the grid shows the Quickstart badge.
 */
export function useIntegrationTileCards(): IntegrationCardItem[] {
  const {
    services: { http },
  } = useKibana<ObservabilityOnboardingAppServices>();
  const { colorMode } = useEuiTheme();

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
        onCardClick: () => {},
      } satisfies IntegrationCardItem;
    });
  }, [colorMode, http]);
}
