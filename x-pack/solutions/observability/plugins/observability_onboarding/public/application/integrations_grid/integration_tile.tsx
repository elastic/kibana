/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCard, EuiTextColor, useEuiTheme } from '@elastic/eui';
import { reactRouterNavigate } from '@kbn/kibana-react-plugin/public';
import { useHistory } from 'react-router-dom';
import { LogoIcon } from '../shared/logo_icon';
import type { IntegrationTileData } from './integration_tiles';

interface Props {
  tile: IntegrationTileData;
}

export const IntegrationTile = ({ tile }: Props) => {
  const history = useHistory();
  const { euiTheme, colorMode } = useEuiTheme();
  const resolvedLogo = colorMode === 'DARK' ? tile.darkLogo ?? tile.logo : tile.logo;
  const routeNavigation = tile.route ? reactRouterNavigate(history, tile.route) : undefined;

  return (
    <EuiCard
      layout="horizontal"
      titleSize="xs"
      hasBorder
      paddingSize="m"
      icon={
        <LogoIcon
          logo={resolvedLogo}
          isAvatar
          size="l"
          avatarType="space"
          hasBorder
          color={euiTheme.colors.backgroundBaseSubdued}
        />
      }
      title={tile.title}
      description={<EuiTextColor color="subdued">{tile.description}</EuiTextColor>}
      data-test-subj={`observabilityOnboardingIntegrationTile-${tile.id}`}
      {...routeNavigation}
    />
  );
};
