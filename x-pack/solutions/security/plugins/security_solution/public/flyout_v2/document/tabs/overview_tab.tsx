/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { EuiHorizontalRule } from '@elastic/eui';
import type { DataTableRecord } from '@kbn/discover-utils';
import { getFieldValue } from '@kbn/discover-utils';
import { EVENT_KIND } from '@kbn/rule-data-utils';
import type { CellActionRenderer } from '../../shared/components/cell_actions';
import { AboutSection } from '../components/about_section';
import { InsightsSection } from '../components/insights_section';
import { InvestigationSection } from '../components/investigation_section';
import { VisualizationsSection } from '../components/visualizations_section';
import { FlyoutMissingAlertsPrivilege } from '../../../flyout/shared/components/flyout_missing_alerts_privilege';
import { FlyoutLoading } from '../../../flyout/shared/components/flyout_loading';
import { useAlertsPrivileges } from '../../../detections/containers/detection_engine/alerts/use_alerts_privileges';
import { EventKind } from '../constants/event_kinds';

export interface OverviewTabProps {
  /**
   * Document to display in the overview tab
   */
  hit: DataTableRecord;
  /**
   * Pass cell action renderer to the analyzer graph in the visualizations section of the overview tab.
   */
  renderCellActions: CellActionRenderer;
}

/**
 * Overview view displayed in the document details expandable flyout right section
 */
export const OverviewTab = memo(({ hit, renderCellActions }: OverviewTabProps) => {
  const isAlert = useMemo(
    () => (getFieldValue(hit, EVENT_KIND) as string) === EventKind.signal,
    [hit]
  );

  const { hasAlertsRead, loading } = useAlertsPrivileges();
  const missingAlertsPrivilege = !loading && !hasAlertsRead && isAlert;

  if (isAlert && loading) {
    return <FlyoutLoading data-test-subj="document-overview-loading" />;
  }

  if (missingAlertsPrivilege) {
    return <FlyoutMissingAlertsPrivilege />;
  }

  return (
    <>
      <AboutSection hit={hit} />
      <EuiHorizontalRule margin="m" />
      <InvestigationSection hit={hit} renderCellActions={renderCellActions} />
      <EuiHorizontalRule margin="m" />
      <VisualizationsSection hit={hit} renderCellActions={renderCellActions} />
      <EuiHorizontalRule margin="m" />
      <InsightsSection hit={hit} />
    </>
  );
});

OverviewTab.displayName = 'OverviewTab';
