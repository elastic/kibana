/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import {
  EuiBadge,
  EuiButtonIcon,
  EuiCopy,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { REPORT } from '../report_data';
import * as i18n from '../translations';

export const DETONATION_HEADER_TEST_ID = 'detonationReportHeader';

const truncateStyles = css`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const COPY_TO_CLIPBOARD = i18n.COPY_TO_CLIPBOARD;

/** Small bordered widget with a label and a value, like the entity flyout summary grid. */
const SummaryPanel = memo(({ label, children }: { label: string; children: React.ReactNode }) => (
  <EuiPanel
    hasBorder
    paddingSize="s"
    css={css`
      min-width: 0;
      padding: 8px 12px 10px;
    `}
  >
    <EuiText size="xs" color="subdued">
      {label}
    </EuiText>
    <EuiSpacer size="xs" />
    {children}
  </EuiPanel>
));
SummaryPanel.displayName = 'SummaryPanel';

/** Monospace value that truncates, with a copy button. */
const CopyableValue = memo(
  ({ value, 'data-test-subj': dataTestSubj }: { value: string; 'data-test-subj'?: string }) => (
    <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
      <EuiFlexItem css={{ minWidth: 0 }}>
        <EuiText
          size="xs"
          css={css`
            ${truncateStyles}
            font-family: ${'monospace'};
          `}
          title={value}
          data-test-subj={dataTestSubj}
        >
          {value}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiCopy textToCopy={value}>
          {(copy) => (
            <EuiToolTip content={COPY_TO_CLIPBOARD} disableScreenReaderOutput>
              <EuiButtonIcon
                iconType="copyClipboard"
                size="xs"
                color="text"
                aria-label={COPY_TO_CLIPBOARD}
                onClick={copy}
              />
            </EuiToolTip>
          )}
        </EuiCopy>
      </EuiFlexItem>
    </EuiFlexGroup>
  )
);
CopyableValue.displayName = 'CopyableValue';

/**
 * Header of the detonation report flyout: report type, file name with verdict badge, and the
 * report metadata.
 */
export const Header = memo(() => (
  <div data-test-subj={DETONATION_HEADER_TEST_ID}>
    <EuiTitle size="xxs">
      <h3>{i18n.DETONATION_REPORT_TITLE.toUpperCase()}</h3>
    </EuiTitle>
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
      <EuiFlexItem grow={false}>
        <EuiTitle size="s">
          <h2>{REPORT.fileName}</h2>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiBadge color="danger">{i18n.MALICIOUS}</EuiBadge>
      </EuiFlexItem>
    </EuiFlexGroup>
    <EuiSpacer size="s" />
    <EuiFlexGrid columns={2} gutterSize="s" responsive={false}>
      <SummaryPanel label={i18n.REPORT_ID}>
        <CopyableValue value={REPORT.reportId} data-test-subj="detonationReportId" />
      </SummaryPanel>
      <SummaryPanel label={i18n.SHA_256}>
        <CopyableValue value={REPORT.sha256} data-test-subj="detonationSha256" />
      </SummaryPanel>
      <SummaryPanel label={i18n.SUBMITTED}>
        <EuiText size="xs" css={truncateStyles} title={REPORT.submitted}>
          {REPORT.submitted}
        </EuiText>
      </SummaryPanel>
      <SummaryPanel label={i18n.SOURCE}>
        <EuiText size="xs" css={truncateStyles}>
          <EuiLink>{REPORT.sourceLink}</EuiLink>
          {` · ${REPORT.sourceText}`}
        </EuiText>
      </SummaryPanel>
    </EuiFlexGrid>
  </div>
));

Header.displayName = 'Header';
