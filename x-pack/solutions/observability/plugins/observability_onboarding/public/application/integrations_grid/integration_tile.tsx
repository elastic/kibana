/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCard, EuiTextColor, useEuiTheme } from '@elastic/eui';
import { LogoIcon } from '../shared/logo_icon';
import type { IntegrationTileData } from './integration_tiles';

interface Props {
  tile: IntegrationTileData;
}

export const IntegrationTile = ({ tile }: Props) => {
  const { euiTheme, colorMode } = useEuiTheme();
  const resolvedLogo = colorMode === 'DARK' ? tile.darkLogo ?? tile.logo : tile.logo;

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
      onClick={() => {}}
    />
  );
};
