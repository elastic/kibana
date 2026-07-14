/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css, keyframes } from '@emotion/react';
import React from 'react';
import {
  EuiBadge,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import type { EuiBadgeProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedRelative } from '@kbn/i18n-react';
import type { SignificantEvent, SignificantEventStatus } from '@kbn/significant-events-schema';

export interface SignificantEventItemProps {
  event: SignificantEvent;
  onClick?: (event: SignificantEvent) => void;
  onChatClick?: (event: SignificantEvent) => void;
}

const investigatingDotAnimation = keyframes`
  0%, 80%, 100% {
    opacity: 0.35;
    transform: scale(0.75);
  }
  40% {
    opacity: 1;
    transform: scale(1);
  }
`;

function InvestigatingStatus({ label }: { label: string }) {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiBadge
      color="hollow"
      css={css`
        color: ${euiTheme.colors.textSubdued};
      `}
    >
      <span
        css={css`
          align-items: center;
          display: inline-flex;
          gap: 6px;
        `}
      >
        {label}
        <span
          aria-hidden={true}
          data-test-subj="nightshiftInvestigatingStatusSpinner"
          css={css`
            align-items: center;
            display: inline-flex;
            gap: 2px;
          `}
        >
          {[0, 160, 320].map((delay) => (
            <span
              key={delay}
              css={css`
                animation: ${investigatingDotAnimation} 1.2s ease-in-out ${delay}ms infinite;
                background: ${euiTheme.colors.mediumShade};
                border-radius: 50%;
                height: ${euiTheme.size.xs};
                width: ${euiTheme.size.xs};

                @media (prefers-reduced-motion: reduce) {
                  animation: none;
                }
              `}
            />
          ))}
        </span>
      </span>
    </EuiBadge>
  );
}

const getStatusColor = (status: SignificantEventStatus): string => {
  switch (status) {
    case 'promoted':
    case 'acknowledged':
      return 'danger';
    case 'resolved':
    case 'closed':
      return 'success';
    case 'demoted':
      return 'subdued';
    default:
      return 'subdued';
  }
};

const getStatusLabel = (status: SignificantEventStatus): string => {
  switch (status) {
    case 'promoted':
    case 'acknowledged':
      return i18n.translate('xpack.observability.nightshift.event.investigatingStatusLabel', {
        defaultMessage: 'Investigating',
      });
    case 'resolved':
    case 'closed':
      return i18n.translate('xpack.observability.nightshift.event.investigatedStatusLabel', {
        defaultMessage: 'Investigated',
      });
    case 'demoted':
      return i18n.translate('xpack.observability.nightshift.event.dismissedStatusLabel', {
        defaultMessage: 'Dismissed',
      });
    default:
      return status;
  }
};

const getInvestigationBadgeIcon = (
  status: SignificantEventStatus
): EuiBadgeProps['iconType'] | undefined => {
  switch (status) {
    case 'resolved':
    case 'closed':
      return 'check';
    case 'demoted':
      return 'cross';
    default:
      return undefined;
  }
};

export function SignificantEventItem({ event, onClick, onChatClick }: SignificantEventItemProps) {
  const { euiTheme } = useEuiTheme();
  const statusColor = getStatusColor(event.status);
  const statusDotColors: Record<string, string> = {
    danger: euiTheme.colors.danger,
    success: euiTheme.colors.success,
    subdued: euiTheme.colors.mediumShade,
  };
  const statusDotColor = statusDotColors[statusColor];
  const statusLabel = getStatusLabel(event.status);
  const isInvestigating = event.status === 'promoted' || event.status === 'acknowledged';
  const isInvestigated = event.status === 'resolved' || event.status === 'closed';

  const handleKeyDown = (keyboardEvent: React.KeyboardEvent<HTMLDivElement>) => {
    if (onClick && (keyboardEvent.key === 'Enter' || keyboardEvent.key === ' ')) {
      keyboardEvent.preventDefault();
      onClick(event);
    }
  };

  return (
    <div
      data-test-subj="nightshiftSignificantEventItem"
      onClick={onClick ? () => onClick(event) : undefined}
      onKeyDown={handleKeyDown}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      css={css`
        background: ${euiTheme.colors.backgroundBasePlain};
        cursor: ${onClick ? 'pointer' : 'default'};
        padding: ${euiTheme.size.m};

        &:hover {
          background: ${onClick ? euiTheme.colors.backgroundBaseInteractiveHover : 'inherit'};
        }
      `}
    >
      <div
        css={css`
          display: flex;
          flex-direction: column;
          gap: ${euiTheme.size.xs};
        `}
      >
        <EuiFlexGroup
          alignItems="center"
          gutterSize="s"
          justifyContent="spaceBetween"
          responsive={false}
        >
          <EuiFlexItem grow={false}>
            {isInvestigating ? (
              <InvestigatingStatus label={statusLabel} />
            ) : (
              <EuiBadge
                color="hollow"
                iconType={getInvestigationBadgeIcon(event.status)}
                iconSide="left"
                css={
                  isInvestigated
                    ? css`
                        background: ${euiTheme.colors.backgroundBasePlain};
                        border-color: ${euiTheme.colors.borderBasePrimary};
                        color: ${euiTheme.colors.textPrimary};
                      `
                    : undefined
                }
              >
                {statusLabel}
              </EuiBadge>
            )}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued">
                  <FormattedRelative value={event.created_at} />
                </EuiText>
              </EuiFlexItem>
              {onChatClick && (
                <EuiFlexItem grow={false}>
                  <EuiToolTip
                    content={i18n.translate(
                      'xpack.observability.nightshift.event.openInChatTooltip',
                      {
                        defaultMessage: 'Open in chat',
                      }
                    )}
                  >
                    <EuiButtonIcon
                      aria-label={i18n.translate(
                        'xpack.observability.nightshift.event.openInChatButtonAriaLabel',
                        {
                          defaultMessage: 'Open {eventTitle} in chat',
                          values: { eventTitle: event.title },
                        }
                      )}
                      data-test-subj="nightshiftOpenEventInChatButton"
                      iconType="productAgent"
                      onClick={(clickEvent: React.MouseEvent<HTMLButtonElement>) => {
                        clickEvent.stopPropagation();
                        onChatClick(event);
                      }}
                      size="s"
                    />
                  </EuiToolTip>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>

        <div
          css={css`
            display: flex;
          `}
        >
          <span
            aria-hidden={true}
            css={css`
              align-items: flex-start;
              display: flex;
              height: 18px;
              padding: 6px 4px;
              width: 14px;
            `}
          >
            <span
              css={css`
                background: ${statusDotColor};
                border-radius: 50%;
                height: 6px;
                width: 6px;
              `}
            />
          </span>
          <div
            css={css`
              display: flex;
              flex: 1;
              flex-direction: column;
              gap: ${euiTheme.size.xs};
              min-width: 0;
            `}
          >
            <p
              className="eui-textTruncate"
              data-test-subj="o11ySignificantEventItemLink"
              css={css`
                font-size: 14px;
                font-weight: ${euiTheme.font.weight.medium};
                line-height: 20px;
                margin: 0;
              `}
            >
              {event.title}
            </p>
            <p
              className="eui-textTruncate"
              css={css`
                color: ${euiTheme.colors.textSubdued};
                font-size: 12px;
                line-height: ${euiTheme.size.base};
                margin: 0;
              `}
            >
              {event.summary}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
