/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { DataTableRecord } from '@kbn/discover-utils';
import { FooterAiActions } from './components/footer_ai_actions';
import { TakeAction } from './components/take_action';

export interface FooterProps {
  /**
   * The document to display
   */
  hit: DataTableRecord;
}

/**
 * Footer component rendered at the top of the new document flyout in Security Solution and in Discover
 */
export const Footer = memo(({ hit }: FooterProps) => {
  return (
    <EuiFlexGroup justifyContent="flexEnd" alignItems="center">
      <EuiFlexItem grow={false}>
        <FooterAiActions hit={hit} />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <TakeAction hit={hit} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});

Footer.displayName = 'Footer';
