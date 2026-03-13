/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiPanel, EuiHorizontalRule } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ResponseSection } from '../components/response_section';
import { AiSummarySection } from '../components/ai_summary_section';
import { InvestigationSection } from '../components/investigation_section';
import { AboutSection } from '../components/about_section';
import { InsightsSection } from '../components/insights_section';
import { VisualizationsSection } from '../components/visualizations_section';
import { useDocumentDetailsContext } from '../../shared/context';
import { getField } from '../../shared/utils';
import { EventKind } from '../../shared/constants/event_kinds';

/**
 * Overview view displayed in the document details expandable flyout right section
 */
export const OverviewTab = memo(() => {
  const { getFieldsData } = useDocumentDetailsContext();
  const eventKind = getField(getFieldsData('event.kind'));
  const isAlert = eventKind === EventKind.signal;

  return (
    <EuiPanel
      hasBorder={false}
      hasShadow={false}
      paddingSize="none"
      aria-label={i18n.translate(
        'xpack.securitySolution.flyout.right.overview.overviewContentAriaLabel',
        { defaultMessage: 'Overview' }
      )}
    >
      {isAlert ? (
        <>
          <AiSummarySection />
          <EuiHorizontalRule margin="m" />
        </>
      ) : null}
      <AboutSection />
      <EuiHorizontalRule margin="m" />
      <InvestigationSection />
      <EuiHorizontalRule margin="m" />
      <VisualizationsSection />
      <EuiHorizontalRule margin="m" />
      <InsightsSection />
      <EuiHorizontalRule margin="m" />
      <ResponseSection />
    </EuiPanel>
  );
});

OverviewTab.displayName = 'OverviewTab';
