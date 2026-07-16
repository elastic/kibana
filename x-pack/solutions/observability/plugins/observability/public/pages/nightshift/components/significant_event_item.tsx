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
import { i18n } from '@kbn/i18n';
import { FormattedRelative } from '@kbn/i18n-react';
import {
  AiButtonIcon,
  SvgAiGradientDefs,
  useAiButtonGradientStyles,
  useSvgAiGradient,
} from '@kbn/shared-ux-ai-components';
import type { SignificantEvent } from '@kbn/significant-events-schema';
import { getStatusColor, getStatusLabel, isNeedsActionStatus } from '../significant_event_status';

export interface SignificantEventItemProps {
  event: SignificantEvent;
  onClick?: (event: SignificantEvent) => void;
  onChatClick?: (event: SignificantEvent) => void;
}

// Staggered start offsets (ms) for the three "investigating" dots so they pulse in
// sequence rather than in unison, producing the typing-indicator effect.
const INVESTIGATING_DOT_DELAYS_MS = [0, 160, 320] as const;

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
          gap: calc(${euiTheme.size.xs} + ${euiTheme.size.xxs});
        `}
      >
        {label}
        <span
          aria-hidden={true}
          data-test-subj="nightshiftInvestigatingStatusDots"
          css={css`
            align-items: center;
            display: inline-flex;
            gap: ${euiTheme.size.xxs};
          `}
        >
          {INVESTIGATING_DOT_DELAYS_MS.map((delay) => (
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

export function SignificantEventItem({
  event,
  onClick,
  onChatClick,
}: SignificantEventItemProps): React.ReactElement {
  const { euiTheme } = useEuiTheme();
  const statusColor = getStatusColor(event.status);
  const statusDotColor =
    statusColor === 'success' ? euiTheme.colors.success : euiTheme.colors.danger;
  const statusLabel = getStatusLabel(event.status);
  const isInvestigating = isNeedsActionStatus(event.status);

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
            ) : (
              <InvestigatedStatus label={statusLabel} />
            )}
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
                  {onClick ? (
                    // Opens a flyout (an in-page action), so it never navigates and will
                    // never have an href — the link-requires-href rule does not apply here.
                    // eslint-disable-next-line @elastic/eui/require-href-for-link
                    <EuiLink
                      color="text"
                      data-test-subj="o11ySignificantEventItemLink"
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
