/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import type { FC } from 'react';
import React, { memo } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import type { TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import type { DataTableRecord } from '@kbn/discover-utils';
import { AgentTypeIntegration } from '../../common/components/endpoint/agents/agent_type_integration';
import { useAlertResponseActionsSupport } from '../../common/hooks/endpoint/use_alert_response_actions_support';
import {
  ISOLATE_HOST,
  UNISOLATE_HOST,
} from '../../common/components/endpoint/host_isolation/from_alerts/translations';
import { ToolsFlyoutTitle } from '../shared/components/tools_flyout_title';
import { noopCellActionRenderer } from '../shared/components/cell_actions';
import { HostIsolationView } from './components/host_isolation_view';
import { HOST_ISOLATION_INTEGRATION_TEST_ID, HOST_ISOLATION_TITLE_TEST_ID } from './test_ids';

export interface HostIsolationProps {
  /**
   * Discover-shaped document. Used to render the document title in the flyout header.
   */
  hit: DataTableRecord;
  /**
   * Field-browser shaped data for the alert, fetched once by the parent so we can drive
   * `useAlertResponseActionsSupport` and the legacy isolation form without re-fetching.
   */
  detailsData: TimelineEventsDetailsItem[];
  /**
   * Whether the user is isolating or releasing the host.
   */
  isolateAction: 'isolateHost' | 'unisolateHost';
  /**
   * Closes the surrounding system flyout. Wired to the form's cancel button.
   */
  onClose: () => void;
}

/**
 * Host isolation tools flyout. Renders header (title + agent type) and the
 * isolate/release form. Used from the Flyout v2 Take Action menu in both the
 * Security Solution alerts flyout and Discover (via the OneDiscover bridge).
 */
export const HostIsolation: FC<HostIsolationProps> = memo(
  ({ hit, detailsData, isolateAction, onClose }) => {
    const { euiTheme } = useEuiTheme();
    const {
      details: { agentType },
    } = useAlertResponseActionsSupport(detailsData);

    const title = isolateAction === 'isolateHost' ? ISOLATE_HOST : UNISOLATE_HOST;

    return (
      <>
        <EuiFlyoutHeader
          hasBorder
          css={css`
            padding-block: ${euiTheme.size.s} !important;
          `}
        >
          <EuiFlexGroup
            justifyContent="spaceBetween"
            alignItems="center"
            gutterSize="m"
            responsive={false}
          >
            <EuiFlexItem grow={false}>
              <EuiTitle size="xs">
                <h4 data-test-subj={HOST_ISOLATION_TITLE_TEST_ID}>{title}</h4>
              </EuiTitle>
              <EuiSpacer size="s" />
              <AgentTypeIntegration
                agentType={agentType}
                layout="horizontal"
                data-test-subj={HOST_ISOLATION_INTEGRATION_TEST_ID}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <ToolsFlyoutTitle hit={hit} renderCellActions={noopCellActionRenderer} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <HostIsolationView
            detailsData={detailsData}
            isolateAction={isolateAction}
            onClose={onClose}
          />
        </EuiFlyoutBody>
      </>
    );
  }
);

HostIsolation.displayName = 'HostIsolation';
