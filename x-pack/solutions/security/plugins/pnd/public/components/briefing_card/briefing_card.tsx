/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import React from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { FormattedRelative } from '@kbn/i18n-react';
import type { Investigation } from '@kbn/pnd-common';

export const BriefCard: React.FC<{
  investigation: Investigation;
  hasBorder: boolean;
  onOpen: () => void;
  onOpenChat: () => void;
}> = ({ investigation, hasBorder, onOpen, onOpenChat }) => {
  const { euiTheme } = useEuiTheme();
  const inMotion = investigation.status === 'in-progress';

  return (
    <EuiPanel
      paddingSize="m"
      role="button"
      tabIndex={0}
      aria-label={investigation.title}
      borderRadius="none"
      css={css`
        cursor: pointer;
        border-bottom: ${hasBorder ? `1px solid ${euiTheme.colors.disabled}` : 'none'};
        border-radius: ${hasBorder ? 'none' : euiTheme.size.s};
      `}
      hasBorder={false}
      hasShadow={false}
      onClick={onOpen}
      onKeyDown={(event: React.KeyboardEvent) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen();
        }
      }}
    >
      <EuiFlexGroup alignItems="flexStart" gutterSize="m" responsive={false}>
        {investigation.priorityScore != null ? (
          <EuiFlexItem grow={false}>
            <EuiText size="m">
              <strong>{investigation.priorityScore}</strong>
            </EuiText>
          </EuiFlexItem>
        ) : null}
        <EuiFlexItem>
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap>
            <EuiFlexItem grow={false}>
              <EuiTitle size="xs">
                <h3>{investigation.title}</h3>
              </EuiTitle>
            </EuiFlexItem>
            {investigation.recordId ? (
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued">
                  {investigation.recordId}
                </EuiText>
              </EuiFlexItem>
            ) : null}
            {inMotion ? (
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow">{i18n.IN_MOTION}</EuiBadge>
              </EuiFlexItem>
            ) : null}
            {investigation.pendingProposalCount > 0 ? (
              <EuiFlexItem grow={false}>
                <EuiBadge color="warning">
                  {i18n.pendingProposalsLabel(investigation.pendingProposalCount)}
                </EuiBadge>
              </EuiFlexItem>
            ) : null}
            <EuiFlexItem grow />
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                <FormattedRelative value={investigation.updatedAt} />
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
          {investigation.summary ? (
            <>
              <EuiSpacer size="xs" />
              <EuiText size="s" color="subdued">
                <p>{investigation.summary}</p>
              </EuiText>
            </>
          ) : null}
          <EuiSpacer size="s" />
          <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false} wrap>
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                <strong>{i18n.WATCHED_BY}</strong> {i18n.watchTierLabel(investigation.watch_tier)}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow />
            <EuiFlexItem grow={false}>
              <EuiButton
                size="s"
                color={inMotion ? 'text' : 'primary'}
                onClick={(event: React.MouseEvent) => {
                  event.stopPropagation();
                  onOpen();
                }}
              >
                {investigation.primaryActionLabel ?? i18n.DEFAULT_ACTION}
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiToolTip content={i18n.OPEN_CHAT} disableScreenReaderOutput>
                <EuiButtonIcon
                  aria-label={i18n.OPEN_CHAT}
                  iconType="comment"
                  color="text"
                  onClick={(event: React.MouseEvent) => {
                    event.stopPropagation();
                    onOpenChat();
                  }}
                />
              </EuiToolTip>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
