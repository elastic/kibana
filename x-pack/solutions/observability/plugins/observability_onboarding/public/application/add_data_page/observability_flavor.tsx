/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { useEuiTheme } from '@elastic/eui';
import { reactRouterNavigate } from '@kbn/kibana-react-plugin/public';
import { useHistory } from 'react-router-dom';
import type { CuratedCategory, MiniTile } from '../add_data_grid';
import { LogoIcon } from '../shared/logo_icon';
import { INTEGRATION_TILES } from './integration_tiles';
import { INTEGRATION_MINI_TILES } from './integration_mini_tiles';

/**
 * The o11y "flavor" of the Add Data grid: turns the plugin's curated tile
 * content into the host-agnostic view-models the add_data_grid components
 * consume. Everything plugin-specific (router navigation, LogoIcon asset
 * resolution, test subjects) is resolved here, never inside add_data_grid.
 */
export const useObservabilityCuratedCategories = (): CuratedCategory[] => {
  const history = useHistory();
  const { euiTheme, colorMode } = useEuiTheme();

  return useMemo(
    () =>
      INTEGRATION_TILES.map((category) => ({
        id: category.id,
        label: category.label,
        tiles: category.tiles.map((tile) => {
          const resolvedLogo = colorMode === 'DARK' ? tile.darkLogo ?? tile.logo : tile.logo;
          const navigation = tile.route ? reactRouterNavigate(history, tile.route) : {};

          return {
            id: tile.id,
            title: tile.title,
            description: tile.description,
            icon: (
              <LogoIcon
                logo={resolvedLogo}
                isAvatar
                size="l"
                avatarType="space"
                hasBorder
                color={euiTheme.colors.backgroundBaseSubdued}
              />
            ),
            'data-test-subj': `observabilityOnboardingIntegrationTile-${tile.id}`,
            ...navigation,
          };
        }),
      })),
    [history, colorMode, euiTheme]
  );
};

export const useObservabilityMiniTiles = (): MiniTile[] => {
  const { euiTheme } = useEuiTheme();

  return useMemo(
    () =>
      INTEGRATION_MINI_TILES.map((tile) => ({
        id: tile.id,
        title: tile.title,
        icon: (
          <LogoIcon
            logo={tile.logo}
            isAvatar
            size="l"
            avatarType="space"
            hasBorder
            color={euiTheme.colors.backgroundBaseSubdued}
          />
        ),
        'data-test-subj': `observabilityOnboardingIntegrationMiniTile-${tile.id}`,
        // Mini tile destinations are an open kickoff question. The noop keeps
        // the current interactive card styling until destinations are decided.
        onClick: () => {},
      })),
    [euiTheme]
  );
};
