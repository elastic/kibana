/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiPanel } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DataTableRecord } from '@kbn/discover-utils';

const OVERVIEW_ARIA_LABEL = i18n.translate(
  'xpack.securitySolution.flyout.document.overview.overviewContentAriaLabel',
  { defaultMessage: 'Overview' }
);

export interface OverviewTabProps {
  /**
   * Document to display in the overview tab
   */
  hit: DataTableRecord;
}

/**
 * Overview view displayed in the document details expandable flyout right section
 */
export const OverviewTab = memo(({ hit }: OverviewTabProps) => {
  return (
    <EuiPanel
      hasBorder={false}
      hasShadow={false}
      paddingSize="none"
      aria-label={OVERVIEW_ARIA_LABEL}
    >
      {hit.id}
    </EuiPanel>
  );
});

OverviewTab.displayName = 'OverviewTab';
