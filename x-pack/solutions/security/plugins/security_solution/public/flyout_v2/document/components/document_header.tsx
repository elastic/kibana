/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo } from 'react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { HeaderTitle } from './header_title';

export interface DocumentHeaderProps {
  /**
   * The document to display
   */
  hit: DataTableRecord;
  /**
   * Optional link URL for the title
   */
  titleHref?: string;
}

/**
 * Document header container for the flyout.
 * Currently renders only the title; future PRs will add severity, timestamp, and metadata blocks.
 */
export const DocumentHeader: FC<DocumentHeaderProps> = memo(({ hit, titleHref }) => {
  return <HeaderTitle hit={hit} titleHref={titleHref} />;
});

DocumentHeader.displayName = 'DocumentHeader';
