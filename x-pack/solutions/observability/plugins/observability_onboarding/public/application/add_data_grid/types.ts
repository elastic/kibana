/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MouseEventHandler, ReactElement } from 'react';

/**
 * Host-built view-model for a curated tile. `icon` is a ReactElement, not a
 * ReactNode: EuiCard clones it to attach its `euiCard__icon` styling.
 */
export interface CuratedTile {
  id: string;
  title: string;
  description: string;
  icon: ReactElement;
  href?: string;
  onClick?: MouseEventHandler;
  'data-test-subj'?: string;
}

export interface CuratedCategory {
  id: string;
  label: string;
  tiles: readonly CuratedTile[];
}

export interface MiniTile {
  id: string;
  title: string;
  icon: ReactElement;
  href?: string;
  onClick?: MouseEventHandler;
  'data-test-subj'?: string;
}
