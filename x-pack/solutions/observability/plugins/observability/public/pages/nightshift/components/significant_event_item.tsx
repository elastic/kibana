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
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiText,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import type { EuiBadgeProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedRelative } from '@kbn/i18n-react';
import {
  AiButtonIcon,
  SvgAiGradientDefs,
  useAiButtonGradientStyles,
  useSvgAiGradient,
} from '@kbn/shared-ux-ai-components';
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

function InvestigatedStatus({ label }: { label: string }) {
  const { euiTheme } = useEuiTheme();
  const { labelCss } = useAiButtonGradientStyles({ variant: 'outlined' });
  const { gradientId, iconGradientCss, colors } = useSvgAiGradient({ variant: 'outlined' });

  const borderGradient = `linear-gradient(90deg, ${euiTheme.colors.backgroundLightPrimary} 2.98%, ${euiTheme.colors.backgroundLightAssistance} 66.24%)`;

  return (
    <>
      <SvgAiGradientDefs gradientId={gradientId} colors={colors} />
      <EuiBadge
        color="hollow"
        iconType="check"
        iconSide="left"
        data-test-subj="nightshiftInvestigatedStatus"
        css={[
          iconGradientCss,
          css`
            background: linear-gradient(
                  ${euiTheme.colors.backgroundBasePlain},
                  ${euiTheme.colors.backgroundBasePlain}
                )
                padding-box,
              ${borderGradient} border-box;
            border: ${euiTheme.border.width.thin} solid transparent;
            border-radius: ${euiTheme.size.l};

            .euiBadge__text {
              ${labelCss}
            }
          `,
        ]}
      >
        {label}
      </EuiBadge>
    </>
  );
}

type StatusColor = 'danger' | 'subdued' | 'success';

const getStatusColor = (status: SignificantEventStatus): StatusColor => {
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
  const statusDotColors: Record<StatusColor, string> = {
    danger: euiTheme.colors.danger,
    success: euiTheme.colors.success,
    subdued: euiTheme.colors.mediumShade,
  };
  const statusDotColor = statusDotColors[statusColor];
  const statusLabel = getStatusLabel(event.status);
  const isInvestigating = event.status === 'promoted' || event.status === 'acknowledged';
  const isInvestigated = event.status === 'resolved' || event.status === 'closed';

  return (
    <div
      data-test-subj="nightshiftSignificantEventItem"
      css={css`
        background: ${euiTheme.colors.backgroundBasePlain};
        padding: ${euiTheme.size.m};
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
            {isInvestigating ? (
              <InvestigatingStatus label={statusLabel} />
            ) : isInvestigated ? (
              <InvestigatedStatus label={statusLabel} />
            ) : (
              <EuiBadge
                color="hollow"
                iconType={getInvestigationBadgeIcon(event.status)}
                iconSide="left"
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
                    <AiButtonIcon
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
                  data-test-subj="o11ySignificantEventItemLink"
                  size="s"
                  css={css`
                    font-weight: ${euiTheme.font.weight.medium};
                    line-height: 20px;
                    margin: 0;
                  `}
                >
                  {onClick ? (
                    <EuiLink
                      data-test-subj="o11ySignificantEventItemLink"
                      color="text"
                      onClick={() => onClick(event)}
                    >
                      {event.title}
                    </EuiLink>
                  ) : (
                    event.title
                  )}
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
