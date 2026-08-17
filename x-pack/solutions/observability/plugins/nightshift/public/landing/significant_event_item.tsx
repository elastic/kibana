/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import React from 'react';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import { FormattedRelative } from '@kbn/i18n-react';
import { AiButtonIcon } from '@kbn/shared-ux-ai-components';
import type { SignificantEvent } from '@kbn/significant-events-schema';
import { InvestigationStatusBadge } from '../investigation/investigation_status_badge';
import { getStatusColor } from '../event/significant_event_status';
import {
  NIGHTSHIFT_EBT_ACTIONS,
  NIGHTSHIFT_EBT_DETAILS,
  NIGHTSHIFT_EBT_ELEMENTS,
} from '../common/ebt_constants';
import { nightshiftBackgroundTransition } from '../common/transition';

export interface SignificantEventItemProps {
  event: SignificantEvent;
  isSelected?: boolean;
  onClick?: (event: SignificantEvent) => void;
  onChatClick?: (event: SignificantEvent) => void;
  onCloseClick?: (event: SignificantEvent) => void;
  isClosing?: boolean;
}

export function SignificantEventItem({
  event,
  isSelected = false,
  onClick,
  onChatClick,
  onCloseClick,
  isClosing = false,
}: SignificantEventItemProps): React.ReactElement {
  const { euiTheme } = useEuiTheme();
  const statusColor = getStatusColor(event.status);
  const statusDotColor =
    statusColor === 'success' ? euiTheme.colors.success : euiTheme.colors.danger;

  const handleClick = (clickEvent: React.MouseEvent<HTMLDivElement>) => {
    if (
      clickEvent.target instanceof Element &&
      clickEvent.target.closest('[data-prevent-row-click]')
    ) {
      return;
    }
    // Releasing the mouse after selecting row text also fires a click.
    if (window.getSelection()?.toString()) {
      return;
    }
    onClick?.(event);
  };

  const handleKeyDown = (keyboardEvent: React.KeyboardEvent<HTMLDivElement>) => {
    // Only activate for keys pressed on the row itself, not on the nested chat button.
    if (keyboardEvent.target !== keyboardEvent.currentTarget) {
      return;
    }
    if (keyboardEvent.key === 'Enter' || keyboardEvent.key === ' ') {
      keyboardEvent.preventDefault();
      keyboardEvent.currentTarget.click();
    }
  };

  return (
    // Not a native <button> because the row nests the interactive chat button.
    <div
      data-test-subj="nightshiftSignificantEventItem"
      {...(onClick
        ? getEbtProps({
            action: NIGHTSHIFT_EBT_ACTIONS.VIEW_SIGNIFICANT_EVENT,
            element: NIGHTSHIFT_EBT_ELEMENTS.SIGNIFICANT_EVENTS_LIST,
            detail: event.status,
          })
        : {})}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-pressed={onClick ? isSelected : undefined}
      onClick={onClick ? handleClick : undefined}
      onKeyDown={onClick ? handleKeyDown : undefined}
      css={css`
        background: ${isSelected
          ? euiTheme.colors.backgroundBaseInteractiveSelect
          : euiTheme.colors.backgroundBasePlain};
        padding: ${euiTheme.size.m};
        ${onClick
          ? `
        cursor: pointer;
        transition: ${nightshiftBackgroundTransition(euiTheme)};

        &:hover {
          background: ${
            isSelected
              ? euiTheme.colors.backgroundBaseInteractiveSelect
              : euiTheme.colors.backgroundBaseSubdued
          };
        }
        `
          : ''}
      `}
    >
      <EuiFlexGroup alignItems="stretch" direction="column" gutterSize="xs" responsive={false}>
        <EuiFlexGroup
          alignItems="center"
          gutterSize="s"
          justifyContent="spaceBetween"
          responsive={false}
        >
          <EuiFlexItem grow={false}>
            <InvestigationStatusBadge event={event} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued">
                  <FormattedRelative value={event['@timestamp']} />
                </EuiText>
              </EuiFlexItem>
              {onChatClick && (
                <EuiFlexItem grow={false}>
                  <EuiToolTip
                    content={i18n.translate('xpack.nightshift.event.openInChatTooltip', {
                      defaultMessage: 'Open in chat',
                    })}
                  >
                    <AiButtonIcon
                      aria-label={i18n.translate(
                        'xpack.nightshift.event.openInChatButtonAriaLabel',
                        {
                          defaultMessage: 'Open {eventTitle} in chat',
                          values: { eventTitle: event.title },
                        }
                      )}
                      data-prevent-row-click
                      data-test-subj="nightshiftOpenEventInChatButton"
                      {...getEbtProps({
                        action: NIGHTSHIFT_EBT_ACTIONS.OPEN_IN_CHAT,
                        element: NIGHTSHIFT_EBT_ELEMENTS.SIGNIFICANT_EVENTS_LIST,
                        detail: NIGHTSHIFT_EBT_DETAILS.NEW_CONVERSATION,
                      })}
                      iconType="productAgent"
                      onClick={() => onChatClick(event)}
                      size="s"
                      variant="empty"
                      css={css`
                        && {
                          color: ${euiTheme.colors.textSubdued} !important;
                        }

                        &&:not(:hover):not(:focus-visible) {
                          background: transparent !important;
                        }

                        && .euiIcon,
                        && .euiIcon [fill]:not([fill='none']) {
                          color: currentColor !important;
                          fill: currentColor !important;
                        }
                      `}
                    />
                  </EuiToolTip>
                </EuiFlexItem>
              )}
              {onCloseClick && event.status === 'open' && (
                <EuiFlexItem grow={false}>
                  <EuiToolTip
                    content={i18n.translate('xpack.nightshift.event.closeEventTooltip', {
                      defaultMessage: 'Close significant event',
                    })}
                    disableScreenReaderOutput
                  >
                    <EuiButtonIcon
                      aria-label={i18n.translate(
                        'xpack.nightshift.event.closeEventButtonAriaLabel',
                        {
                          defaultMessage: 'Close {eventTitle}',
                          values: { eventTitle: event.title },
                        }
                      )}
                      color="text"
                      data-prevent-row-click
                      data-test-subj="nightshiftCloseSignificantEventButton"
                      {...getEbtProps({
                        action: NIGHTSHIFT_EBT_ACTIONS.CLOSE_SIGNIFICANT_EVENT,
                        element: NIGHTSHIFT_EBT_ELEMENTS.SIGNIFICANT_EVENTS_LIST,
                        detail: NIGHTSHIFT_EBT_DETAILS.NEEDS_ACTION,
                      })}
                      iconType="cross"
                      isDisabled={isClosing}
                      isLoading={isClosing}
                      onClick={() => onCloseClick(event)}
                      size="s"
                    />
                  </EuiToolTip>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiFlexGroup gutterSize="none" responsive={false}>
          <EuiFlexItem grow={false}>
            <span
              aria-hidden={true}
              css={css`
                align-items: flex-start;
                display: flex;
                height: calc(${euiTheme.size.base} + ${euiTheme.size.xxs});
                padding: calc(${euiTheme.size.xs} + ${euiTheme.size.xxs}) ${euiTheme.size.xs};
                width: calc(${euiTheme.size.m} + ${euiTheme.size.xxs});
              `}
            >
              <span
                css={css`
                  background: ${statusDotColor};
                  border-radius: 50%;
                  height: calc(${euiTheme.size.xs} + ${euiTheme.size.xxs});
                  width: calc(${euiTheme.size.xs} + ${euiTheme.size.xxs});
                `}
              />
            </span>
          </EuiFlexItem>
          <EuiFlexItem
            css={css`
              min-width: 0;
            `}
          >
            <EuiFlexGroup direction="column" gutterSize="xs" responsive={false}>
              <EuiFlexItem>
                <EuiText
                  className="eui-textTruncate"
                  component="p"
                  size="s"
                  css={css`
                    font-weight: ${euiTheme.font.weight.medium};
                    line-height: calc(${euiTheme.size.base} + ${euiTheme.size.xs});
                    margin: 0;
                  `}
                >
                  {event.title}
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText
                  className="eui-textTruncate"
                  color="subdued"
                  component="p"
                  size="xs"
                  css={css`
                    line-height: ${euiTheme.size.base};
                    margin: 0;
                  `}
                >
                  {event.summary}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexGroup>
    </div>
  );
}
