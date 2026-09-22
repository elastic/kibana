/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCard, EuiTextColor } from '@elastic/eui';
import type { CuratedTile } from '../types';

interface Props {
  tile: CuratedTile;
}

export const CuratedTileCard = ({ tile }: Props) => (
  <EuiCard
    layout="horizontal"
    titleSize="xs"
    hasBorder
    paddingSize="m"
    icon={tile.icon}
    title={tile.title}
    description={<EuiTextColor color="subdued">{tile.description}</EuiTextColor>}
    data-test-subj={tile['data-test-subj']}
    href={tile.href}
    onClick={tile.onClick}
  />
);
