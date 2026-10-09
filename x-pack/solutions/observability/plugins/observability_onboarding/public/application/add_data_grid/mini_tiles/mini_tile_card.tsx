/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCard } from '@elastic/eui';
import type { MiniTile } from '../types';

interface Props {
  tile: MiniTile;
}

export const MiniTileCard = ({ tile }: Props) => (
  <EuiCard
    data-test-subj={tile['data-test-subj']}
    titleSize="xs"
    hasBorder
    icon={tile.icon}
    title={tile.title}
    href={tile.href}
    onClick={tile.onClick}
  />
);
