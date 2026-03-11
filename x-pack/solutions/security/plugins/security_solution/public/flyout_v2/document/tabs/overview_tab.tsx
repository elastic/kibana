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
import { DEFAULT_ALERTS_INDEX } from '../../../../common/constants';
import { useAlertsPrivileges } from '../../../detections/containers/detection_engine/alerts/use_alerts_privileges';
import { FlyoutMissingAlertsPrivilege } from '../../../flyout/shared/components/flyout_missing_alerts_privilege';
import { AboutSection } from '../components/about_section';
import { InvestigationSection } from '../components/investigation_section';
import { VisualizationsSection } from '../components/visualizations_section';

const OVERVIEW_ARIA_LABEL = i18n.translate(
  'xpack.securitySolution.flyout.document.overview.overviewContentAriaLabel',
  { defaultMessage: 'Overview' }
);

function isAlertHit(hit: DataTableRecord): boolean {
  const eventIndex = (hit.raw as { _index?: string })?._index;
  return eventIndex != null && eventIndex.includes(DEFAULT_ALERTS_INDEX);
}

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
  const { hasAlertsRead } = useAlertsPrivileges();
  const missingAlertsPrivilege = isAlertHit(hit) && !hasAlertsRead;

  if (missingAlertsPrivilege) {
    return <FlyoutMissingAlertsPrivilege />;
  }

  return (
    <EuiPanel hasBorder={false} hasShadow={false} aria-label={OVERVIEW_ARIA_LABEL}>
      <AboutSection hit={hit} />
      <EuiHorizontalRule margin="m" />
      <InvestigationSection hit={hit} />
      <EuiHorizontalRule margin="m" />
      <VisualizationsSection hit={hit} />
    </EuiPanel>
  );
});

OverviewTab.displayName = 'OverviewTab';
