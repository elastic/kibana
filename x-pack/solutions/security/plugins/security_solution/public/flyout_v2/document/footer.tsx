/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import type { DataTableRecord } from '@kbn/discover-utils';

export interface FooterProps {
  /**
   * The document to display
   */
  hit: DataTableRecord;
}

export const Footer = memo(({ hit }: FooterProps) => {
  return <></>;
});

Footer.displayName = 'Footer';
