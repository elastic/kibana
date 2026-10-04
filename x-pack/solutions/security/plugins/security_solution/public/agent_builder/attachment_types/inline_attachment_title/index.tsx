/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiBadgeGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { HeaderData } from '@kbn/agent-builder-browser/attachments';

export const INLINE_ATTACHMENT_TITLE_TEST_ID = 'securityInlineAttachmentTitle';

interface Props extends HeaderData {
  'data-test-subj'?: string;
  title: string;
}

/**
 * The title row an inline attachment card would show in its header.
 *
 * TEMPORARY: Agent Builder's `AttachmentHeader` (`@elastic/workchat-eng`) renders nothing for a
 * type without action buttons (`attachment_header.tsx`,
 * `if (!hasCloseButton && !hasActionButtons) return null`), so `getLabel` and `getHeader` never
 * reach the screen. Remove this row, and its callers, once the platform header renders for types
 * that define `getHeader`, or every card shows two titles. The platform header takes its title
 * from `getLabel`, which for the verdict repeats the verdict badge, so make the verdict's
 * `getLabel` generic at the same time.
 *
 * Only the verdict card uses it: the Attack Discovery card has an "Open in Attacks" action, so
 * the platform header already renders for it.
 */
export const InlineAttachmentTitle = ({
  badges,
  'data-test-subj': dataTestSubj = INLINE_ATTACHMENT_TITLE_TEST_ID,
  icon,
  subtitle,
  title,
}: Props) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexGroup
      alignItems="center"
      data-test-subj={dataTestSubj}
      gutterSize="s"
      responsive={false}
    >
      {icon != null && (
        <EuiFlexItem grow={false}>
          <EuiIcon aria-hidden={true} color="subdued" size="l" type={icon} />
        </EuiFlexItem>
      )}
      <EuiFlexItem
        css={css`
          min-width: 0;
        `}
        grow={true}
      >
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap>
          <EuiFlexItem grow={false}>
            <EuiText
              css={css`
                font-weight: ${euiTheme.font.weight.semiBold};
              `}
              size="s"
            >
              {title}
            </EuiText>
          </EuiFlexItem>
          {badges != null && badges.length > 0 && (
            <EuiFlexItem grow={false}>
              <EuiBadgeGroup gutterSize="xs">
                {badges.map(({ color, iconType, label }, index) => (
                  <EuiBadge color={color} iconType={iconType} key={index}>
                    {label}
                  </EuiBadge>
                ))}
              </EuiBadgeGroup>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
        {subtitle != null && (
          <EuiText color="subdued" size="xs">
            {subtitle}
          </EuiText>
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
