/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MouseEventHandler, ReactElement, ReactNode } from 'react';

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
  /** Anchor `target`, for example `_blank` for external destinations. */
  target?: string;
  onClick?: MouseEventHandler;
  /** Optional badge rendered in the top-right corner, e.g. a collection's variant count. */
  badge?: ReactNode;
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
  /** Optional badge rendered under the title, e.g. a collection's variant count. */
  badge?: ReactNode;
  'data-test-subj'?: string;
}

/** Host-built view-model for one collection method inside a chooser. */
export interface CollectionVariant {
  id: string;
  title: string;
  description: string;
  icon: ReactElement;
  href?: string;
  onClick?: MouseEventHandler;
  /** Optional badge rendered beside the title, e.g. the host's recommendation. */
  badge?: ReactNode;
  'data-test-subj'?: string;
}

/** Host-built view-model for one documentation and support link. */
export interface DocsLink {
  id: string;
  title: string;
  description: string;
  linkLabel: string;
  href?: string;
  icon: ReactElement;
  linkAriaLabel?: string;
  'data-test-subj'?: string;
}
