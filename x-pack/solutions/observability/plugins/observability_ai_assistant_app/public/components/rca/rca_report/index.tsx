/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFlexGroup,
  EuiHorizontalRule,
  EuiMarkdownFormat,
  EuiPanel,
  EuiTitle,
} from '@elastic/eui';
import type { SignificantEventsTimeline } from '@kbn/observability-ai-server/root_cause_analysis';

export function RootCauseAnalysisReport({
  report,
  timeline,
}: {
  report: string;
  timeline: SignificantEventsTimeline;
}) {
  return (
    <EuiPanel hasBorder paddingSize="l">
      <EuiFlexGroup direction="column">
        <EuiFlexGroup direction="row" gutterSize="s">
          <EuiTitle size="s">
            <h2>
              {i18n.translate('xpack.observabilityAiAssistant.rootCauseAnalysisReport.title', {
                defaultMessage: 'Report',
              })}
            </h2>
          </EuiTitle>
        </EuiFlexGroup>
      </EuiFlexGroup>
      <EuiHorizontalRule margin="xl" />
      <EuiMarkdownFormat textSize="s">{report}</EuiMarkdownFormat>
    </EuiPanel>
  );
}
