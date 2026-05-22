/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCard, useEuiTheme } from '@elastic/eui';
import { LogoIcon } from '../../shared/logo_icon';
import type { MiniIntegrationTileDefinition } from './mini_tiles_config';

interface Props {
  tile: MiniIntegrationTileDefinition;
}

export const MiniIntegrationTile = ({ tile }: Props) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiCard
      data-test-subj={`observabilityOnboardingMiniIntegrationTile-${tile.id}`}
      titleSize="xs"
      hasBorder
      icon={
        <LogoIcon
          logo={tile.logo}
          isAvatar
          size="l"
          type="space"
          hasBorder
          color={euiTheme.colors.backgroundBaseSubdued}
        />
      }
      title={tile.title}
      onClick={() => {}}
    />
  );
};
