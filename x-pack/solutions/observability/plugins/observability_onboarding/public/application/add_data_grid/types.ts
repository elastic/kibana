/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MouseEventHandler, ReactElement } from 'react';

/**
 * View-model for a curated integration tile. Built entirely by the host:
 * `icon` arrives already rendered (the o11y host uses its LogoIcon), and
 * `href`/`onClick` are built with the host's own navigation (router,
 * navigateToApp, or nothing for a non-interactive tile).
 *
 * `icon` is a single ReactElement (not ReactNode) on purpose: EuiCard clones
 * the icon element to attach its `euiCard__icon` styling, so a fragment or
 * string here would silently lose that styling.
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
