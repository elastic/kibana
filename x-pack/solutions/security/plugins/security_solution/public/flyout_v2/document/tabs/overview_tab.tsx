/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiHorizontalRule, EuiPanel } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DataTableRecord } from '@kbn/discover-utils';
import { AboutSection } from '../components/about_section';
import { InvestigationSection } from '../components/investigation_section';
import { VisualizationsSection } from '../components/visualizations_section';
import type { ResolverCellActionRenderer } from '../../../resolver/types';

const OVERVIEW_ARIA_LABEL = i18n.translate(
  'xpack.securitySolution.flyout.document.overview.overviewContentAriaLabel',
  { defaultMessage: 'Overview' }
);

export interface OverviewTabProps {
  /**
   * Document to display in the overview tab
   */
  hit: DataTableRecord;
  /**
   * Pass cell action renderer to the analyzer graph in the visualizations section of the overview tab.
   */
  renderCellActions: ResolverCellActionRenderer;
}

/**
 * Overview view displayed in the document details expandable flyout right section
 */
export const OverviewTab = memo(({ hit, renderCellActions }: OverviewTabProps) => {
  return (
    <EuiPanel hasBorder={false} hasShadow={false} aria-label={OVERVIEW_ARIA_LABEL}>
      <AboutSection hit={hit} />
      <EuiHorizontalRule margin="m" />
      <InvestigationSection hit={hit} />
      <EuiHorizontalRule margin="m" />
      <VisualizationsSection hit={hit} renderCellActions={renderCellActions} />
    </EuiPanel>
  );
});

OverviewTab.displayName = 'OverviewTab';
