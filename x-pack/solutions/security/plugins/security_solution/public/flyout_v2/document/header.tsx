/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo, useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import type { DataTableRecord } from '@kbn/discover-utils';
import { getFieldValue } from '@kbn/discover-utils';
import { EVENT_KIND } from '@kbn/rule-data-utils';
import { flyoutHeaderBlockStyles } from './constants/styles';
import { EventKind } from './constants/event_kinds';
import { Assignees } from './components/assignees';
import { Title } from './components/title';
import { Status } from './components/status';
import { Notes } from '../shared/components/notes';
import { DocumentSeverity } from './components/severity';
import { Timestamp } from './components/timestamp';
import { RiskScore } from './components/risk_score';
import { ALERT_SUMMARY_PANEL_TEST_ID } from '../shared/components/test_ids';
import type { CellActionRenderer } from '../shared/components/cell_actions';
import { noopCellActionRenderer } from '../shared/components/cell_actions';
import { useUserPrivileges } from '../../common/components/user_privileges';

export interface HeaderProps {
  /**
   * The document to display
   */
  hit: DataTableRecord;
  /**
   * Optional cell action renderer for status interactions.
   */
  renderCellActions?: CellActionRenderer;
  /**
   * Optional callback invoked after alert mutations to refresh flyout data.
   */
  onAlertUpdated: () => void;
  /**
   * Callback that opens the notes details view.
   */
  onShowNotes: () => void;
}

/**
 * Document header for the flyout_v2 document flyout.
 * Renders severity, timestamp, title (as a rule-details link for alerts),
 * and alert-only summary blocks (status, risk score assignees, and notes).
 */
export const Header: FC<HeaderProps> = memo(
  ({ hit, renderCellActions = noopCellActionRenderer, onAlertUpdated, onShowNotes }) => {
    const canReadRules = useUserPrivileges().rulesPrivileges.rules.read;
    const isAlert = useMemo(
      () => (getFieldValue(hit, EVENT_KIND) as string) === EventKind.signal,
      [hit]
    );

    return (
      <>
        <DocumentSeverity hit={hit}>
          <EuiSpacer size="m" />
        </DocumentSeverity>
        <Timestamp hit={hit}>
          <EuiSpacer size="xs" />
        </Timestamp>
        <Title hit={hit} hideLink={!canReadRules} />
        {isAlert && (
          <>
            <EuiSpacer size="m" />
            <EuiFlexGroup
              direction="row"
              gutterSize="s"
              responsive={false}
              wrap
              data-test-subj={ALERT_SUMMARY_PANEL_TEST_ID}
            >
              <EuiFlexItem css={flyoutHeaderBlockStyles}>
                <EuiFlexGroup direction="row" gutterSize="s" responsive={false}>
                  <EuiFlexItem>
                    <Status
                      hit={hit}
                      renderCellActions={renderCellActions}
                      onAlertUpdated={onAlertUpdated}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <RiskScore hit={hit} />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
              <EuiFlexItem css={flyoutHeaderBlockStyles}>
                <EuiFlexGroup direction="row" gutterSize="s" responsive={false}>
                  <EuiFlexItem>
                    <Assignees hit={hit} onAlertUpdated={onAlertUpdated} />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <Notes documentId={hit.raw._id ?? ''} onShowNotes={onShowNotes} />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
          </>
        )}
      </>
    );
  }
);

Header.displayName = 'Header';
