/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, ReactNode } from 'react';
import React, { memo } from 'react';
import type { IconType } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiTitle, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { ToolsFlyoutTitle } from './tools_flyout_title';
import { TOOLS_FLYOUT_HEADER_TEST_ID, TOOLS_FLYOUT_HEADER_TIMESTAMP_TEST_ID } from './test_ids';
import { useFlyoutHasBackButton } from '../hooks/use_flyout_has_back_button';

export interface ToolsFlyoutHeaderProps {
  /**
   * Title for the tools flyout (e.g. "Correlations", "Risk score", "Insights").
   */
  title: ReactNode;
  /**
   * Called when the context title button is clicked. Should open the originating
   * document or entity flyout as a child via `overlays.openSystemFlyout` with
   * `session: 'inherit'`.
   */
  onTitleClick?: () => void;
  /**
   * Label shown in the context title button (e.g. rule name or entity name).
   */
  label?: string;
  /**
   * EUI icon type shown next to the label.
   */
  iconType?: IconType;
  /**
   * Optional badge rendered alongside the title button (e.g. severity badge for documents).
   */
  badge?: ReactNode;
  /**
   * Optional metadata rendered below the title row (e.g. timestamp for documents).
   */
  timestamp?: ReactNode;
}

/**
 * Shared header for all tools flyouts. Renders the tool title on the left and optional
 * source context on the right (expand button, label, badge, timestamp).
 */
export const ToolsFlyoutHeader: FC<ToolsFlyoutHeaderProps> = memo(
  ({ title, onTitleClick, label, iconType, badge, timestamp }) => {
    const { euiTheme } = useEuiTheme();
    const showSourceContext = !!label && !!iconType;

    // When the flyout menu renders a back button, the header is pushed onto its own row and no
    // longer overlaps the close button, so we only reserve room for the close button otherwise.
    const hasBackButton = useFlyoutHasBackButton();

    return (
      <EuiFlexGroup
        justifyContent="spaceBetween"
        alignItems="center"
        gutterSize="m"
        responsive={false}
        css={{ flexWrap: 'nowrap', paddingRight: hasBackButton ? 0 : euiTheme.size.l }}
        data-test-subj={TOOLS_FLYOUT_HEADER_TEST_ID}
      >
        <EuiFlexItem grow={false} css={{ flexShrink: 0 }}>
          <EuiTitle size="xs" css={{ whiteSpace: 'nowrap' }}>
            <h4>{title}</h4>
          </EuiTitle>
        </EuiFlexItem>
        {showSourceContext && (
          <EuiFlexItem
            grow={true}
            css={{ marginInlineStart: 'auto', maxWidth: '100%', minWidth: 0 }}
          >
            <EuiFlexGroup
              alignItems="flexEnd"
              direction="column"
              gutterSize="none"
              css={{ minWidth: 0 }}
            >
              <EuiFlexItem css={{ maxWidth: '100%', minWidth: 0 }}>
                <EuiFlexGroup
                  alignItems="center"
                  gutterSize="xs"
                  responsive={false}
                  wrap={false}
                  css={{ maxWidth: '100%', minWidth: 0 }}
                >
                  <EuiFlexItem css={{ minWidth: euiTheme.base * 8 }}>
                    <ToolsFlyoutTitle
                      onTitleClick={onTitleClick}
                      label={label}
                      iconType={iconType}
                    />
                  </EuiFlexItem>
                  {badge && <EuiFlexItem grow={false}>{badge}</EuiFlexItem>}
                </EuiFlexGroup>
              </EuiFlexItem>
              {timestamp && (
                <EuiFlexItem css={{ maxWidth: '100%', minWidth: 0 }}>
                  <EuiToolTip content={timestamp}>
                    <div
                      css={{
                        maxWidth: '100%',
                        overflow: 'hidden',
                        textAlign: 'right',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        '& > *': {
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        },
                      }}
                      data-test-subj={TOOLS_FLYOUT_HEADER_TIMESTAMP_TEST_ID}
                      tabIndex={0}
                    >
                      {timestamp}
                    </div>
                  </EuiToolTip>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    );
  }
);

ToolsFlyoutHeader.displayName = 'ToolsFlyoutHeader';
