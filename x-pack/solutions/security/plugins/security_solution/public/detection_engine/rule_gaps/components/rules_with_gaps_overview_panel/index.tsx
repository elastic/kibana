/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, useCallback } from 'react';

import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiPanel, EuiSpacer } from '@elastic/eui';

import * as i18n from './translations';
import { GapAutoFillStatus } from './gap_auto_fill_status';
import { LastResponseSummaryChart } from './last_response_summary_chart';
import { RuleGapSummaryChart } from './rule_gap_summary_chart';

// Min width for each chart section - when container is too narrow, sections wrap
const SECTION_MIN_WIDTH = 400;

export const RulesWithGapsOverviewPanel = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleToggleExpand = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  return (
    <EuiPanel hasBorder data-test-subj="rule-with-gaps_overview-panel">
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="m">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            iconType={isExpanded ? 'arrowDown' : 'arrowRight'}
            onClick={handleToggleExpand}
            aria-expanded={isExpanded}
            flush="left"
            color="text"
            data-test-subj="rule-monitoring-expand-button"
          >
            <b>{i18n.RULE_MONITORING_OVERVIEW_TITLE}</b>
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <GapAutoFillStatus />
        </EuiFlexItem>
      </EuiFlexGroup>

      {isExpanded && (
        <>
          <EuiSpacer size="m" />
          <EuiFlexGroup gutterSize="xl" wrap>
            <EuiFlexItem style={{ minWidth: SECTION_MIN_WIDTH }}>
              <LastResponseSummaryChart />
            </EuiFlexItem>
            <EuiFlexItem style={{ minWidth: SECTION_MIN_WIDTH }}>
              <RuleGapSummaryChart />
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      )}
    </EuiPanel>
  );
};
