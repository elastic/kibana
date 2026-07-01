/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo, useState } from 'react';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { ArtifactsVersionHistoryTimeline } from './artifacts_version_history_timeline';
import {
  ARTIFACT_CHANGE_HISTORY_STARTED_AT,
  ARTIFACT_CHANGE_HISTORY_SAMPLE_DATA,
} from './artifact_change_history_sample_data';
import type { ArtifactChangeHistoryItem } from './types';
import * as i18n from './translations';

const SIDEBAR_WIDTH = 400;

interface ArtifactsVersionHistoryFlyoutProps {
  onClose: () => void;
  onViewDetails: (item: ArtifactChangeHistoryItem) => void;
}

export const ArtifactsVersionHistoryFlyout = memo(function ArtifactsVersionHistoryFlyout({
  onClose,
  onViewDetails,
}: ArtifactsVersionHistoryFlyoutProps): JSX.Element {
  const { euiTheme } = useEuiTheme();
  const [selectedItem, setSelectedItem] = useState<ArtifactChangeHistoryItem | undefined>(
    ARTIFACT_CHANGE_HISTORY_SAMPLE_DATA[0]
  );

  const styles = useMemo(
    () => ({
      sidebarHeaderCss: css`
        padding: ${euiTheme.size.m};
      `,
      flyoutBodyCss: css`
        & .euiFlyoutBody__overflowContent {
          height: 100%;
          display: flex;
          flex-direction: column;
        }
      `,
      flyoutCss: css`
        top: calc(var(--euiFixedHeadersOffset, 0) + ${euiTheme.size.base});
        bottom: ${euiTheme.size.base};
        height: auto;
        border-top-left-radius: ${euiTheme.border.radius.medium};
        border-bottom-left-radius: ${euiTheme.border.radius.medium};
      `,
    }),
    [euiTheme]
  );

  return (
    <EuiFlyout
      type="push"
      size={`${SIDEBAR_WIDTH}px`}
      ownFocus={false}
      onClose={onClose}
      hideCloseButton
      pushMinBreakpoint="xs"
      paddingSize="none"
      aria-labelledby="artifactsVersionHistorySidebarTitle"
      data-test-subj="artifactsVersionHistoryFlyout"
      css={styles.flyoutCss}
    >
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup
          alignItems="center"
          gutterSize="s"
          responsive={false}
          css={styles.sidebarHeaderCss}
        >
          <EuiFlexItem>
            <EuiTitle size="xs">
              <h2 id="artifactsVersionHistorySidebarTitle">{i18n.VERSION_HISTORY_TITLE}</h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="xs" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiToolTip content={i18n.VIEW_DETAILS_ACTION} disableScreenReaderOutput>
                  <EuiButtonIcon
                    iconType="tableDensityCompact"
                    aria-label={i18n.VIEW_DETAILS_ACTION}
                    data-test-subj="artifactsVersionHistoryTableView"
                  />
                </EuiToolTip>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiToolTip content={i18n.CLOSE_VERSION_HISTORY} disableScreenReaderOutput>
                  <EuiButtonIcon
                    iconType="fold"
                    aria-label={i18n.CLOSE_VERSION_HISTORY}
                    onClick={onClose}
                    data-test-subj="artifactsVersionHistoryCollapse"
                  />
                </EuiToolTip>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiToolTip content={i18n.CLOSE_VERSION_HISTORY} disableScreenReaderOutput>
                  <EuiButtonIcon
                    iconType="cross"
                    aria-label={i18n.CLOSE_VERSION_HISTORY}
                    onClick={onClose}
                    data-test-subj="artifactsVersionHistoryClose"
                  />
                </EuiToolTip>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>
      <EuiFlyoutBody css={styles.flyoutBodyCss}>
        <ArtifactsVersionHistoryTimeline
          items={ARTIFACT_CHANGE_HISTORY_SAMPLE_DATA}
          selectedItemId={selectedItem?.id}
          startedAt={new Date(ARTIFACT_CHANGE_HISTORY_STARTED_AT)}
          onSelectItem={setSelectedItem}
          onViewDetails={onViewDetails}
        />
      </EuiFlyoutBody>
    </EuiFlyout>
  );
});
