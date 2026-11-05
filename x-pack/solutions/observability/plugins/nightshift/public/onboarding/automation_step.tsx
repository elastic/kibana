/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css, keyframes } from '@emotion/react';
import React, { useState } from 'react';
import {
  EuiButton,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiShadow,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { InvestigationSummary } from '@kbn/agentic-investigations-plugin/common';
import { CreateAutomationFlyout } from '../automations/flyouts/create_flyout/create_automation_flyout';
import { useKibana } from '../hooks/use_kibana';

const flow = keyframes`
  to { stroke-dashoffset: -16; }
`;

const pulse = keyframes`
  0% { transform: scale(1); opacity: 0.5; }
  100% { transform: scale(1.9); opacity: 0; }
`;

/** Step 3: the trial investigation keeps running while the user sets up a first automation. */
export function OnboardingAutomationStep({
  investigation,
  automationsHref,
  onInvestigationClick,
}: {
  investigation: InvestigationSummary;
  /** Unset when automations are unavailable. */
  automationsHref?: string;
  onInvestigationClick: (investigation: InvestigationSummary) => void;
}): React.ReactElement {
  return (
    <div data-test-subj="nightshiftOnboardingAutomationStep">
      <EuiTitle size="xs">
        <h3>
          {i18n.translate('xpack.nightshift.onboarding.automate.trialTitle', {
            defaultMessage: 'Trial investigation',
          })}
        </h3>
      </EuiTitle>
      <EuiSpacer size="m" />
      <TrialInvestigationCard investigation={investigation} onClick={onInvestigationClick} />

      <EuiSpacer size="xl" />
      <EuiTitle size="xs">
        <h3>
          {i18n.translate('xpack.nightshift.onboarding.automate.suggestedTitle', {
            defaultMessage: 'Create your first automation',
          })}
        </h3>
      </EuiTitle>
      <EuiSpacer size="m" />
      {automationsHref ? (
        <FirstAutomationCard />
      ) : (
        <EuiCallOut
          announceOnMount
          size="s"
          iconType="info"
          title={i18n.translate('xpack.nightshift.onboarding.automate.unavailableTitle', {
            defaultMessage: 'Automations are not available in this deployment',
          })}
        />
      )}
    </div>
  );
}

function TrialInvestigationCard({
  investigation,
  onClick,
}: {
  investigation: InvestigationSummary;
  onClick: (investigation: InvestigationSummary) => void;
}): React.ReactElement {
  const { euiTheme } = useEuiTheme();
  const InvestigationCard = useKibana().services.agenticInvestigations?.InvestigationCard;
  const { in_progress: isActive } = investigation;

  return (
    <EuiPanel
      hasBorder
      paddingSize="none"
      data-test-subj="nightshiftOnboardingTrialInvestigation"
      css={css`
        overflow: hidden;
      `}
    >
      {InvestigationCard && <InvestigationCard investigation={investigation} onClick={onClick} />}
      <EuiFlexGroup
        alignItems="center"
        gutterSize="s"
        responsive={false}
        css={css`
          border-top: ${euiTheme.border.thin};
          padding: ${euiTheme.size.m} ${euiTheme.size.base};
          background: linear-gradient(
            99deg,
            ${euiTheme.colors.backgroundLightPrimary},
            ${euiTheme.colors.backgroundLightAssistance}
          );
        `}
      >
        <EuiFlexItem grow={false}>
          {isActive ? (
            <EuiLoadingSpinner size="m" />
          ) : (
            <EuiIcon type="checkCircleFill" color="success" aria-hidden={true} />
          )}
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="s" data-test-subj="nightshiftOnboardingTrialInvestigationStatus">
            {isActive ? (
              <>
                <strong>
                  {i18n.translate('xpack.nightshift.onboarding.automate.investigatingTitle', {
                    defaultMessage: 'Agent is investigating',
                  })}
                </strong>
                {' · '}
                {i18n.translate('xpack.nightshift.onboarding.automate.investigatingDescription', {
                  defaultMessage:
                    'It might take a few minutes. Meanwhile, set up an automation for future investigations.',
                })}
              </>
            ) : (
              <strong>
                {i18n.translate('xpack.nightshift.onboarding.automate.completedTitle', {
                  defaultMessage: 'Results are ready',
                })}
              </strong>
            )}
          </EuiText>
        </EuiFlexItem>
        {!isActive && (
          <EuiFlexItem grow={false}>
            <EuiButton
              size="s"
              onClick={() => onClick(investigation)}
              data-test-subj="nightshiftOnboardingTrialInvestigationOpen"
            >
              {i18n.translate('xpack.nightshift.onboarding.automate.openButton', {
                defaultMessage: 'Open',
              })}
            </EuiButton>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiPanel>
  );
}

function FirstAutomationCard(): React.ReactElement {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  return (
    <>
      <EuiPanel hasBorder paddingSize="l" data-test-subj="nightshiftOnboardingFirstAutomation">
        <EuiFlexGroup alignItems="center" gutterSize="xl">
          <EuiFlexItem grow={false}>
            <AutomationIllustration />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiTitle size="xs">
              <h4>
                {i18n.translate('xpack.nightshift.onboarding.automate.firstAutomationTitle', {
                  defaultMessage: 'Let Elastic nightshift investigate for you, automatically',
                })}
              </h4>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiText size="s" color="subdued">
              <p>
                {i18n.translate('xpack.nightshift.onboarding.automate.firstAutomationDescription', {
                  defaultMessage:
                    'Automations let you choose what gets investigated without you asking, such as alerts that fire or Slack notifications in a channel. When one arrives, the agent starts investigating straight away.',
                })}
              </p>
            </EuiText>
            <EuiSpacer size="m" />
            <div>
              <EuiButton
                size="s"
                iconType="plus"
                onClick={() => setIsCreateOpen(true)}
                data-test-subj="nightshiftOnboardingCreateAutomation"
              >
                {i18n.translate('xpack.nightshift.onboarding.automate.createAutomationButton', {
                  defaultMessage: 'Create automation',
                })}
              </EuiButton>
            </div>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
      {isCreateOpen && (
        <CreateAutomationFlyout
          onClose={() => setIsCreateOpen(false)}
          onCreated={() => setIsCreateOpen(false)}
        />
      )}
    </>
  );
}

const ILLUSTRATION_WIDTH = 264;
const ILLUSTRATION_HEIGHT = 156;
const AGENT_X = 210;
const AGENT_Y = 70;

/** Triggers (a Slack message and an alert) flowing into the agent. Decorative only. */
function AutomationIllustration(): React.ReactElement {
  const { euiTheme } = useEuiTheme();
  const chipShadow = useEuiShadow('s');
  const triggers = [
    {
      icon: 'logoSlack',
      top: 24,
      label: i18n.translate('xpack.nightshift.onboarding.automate.illustrationSlack', {
        defaultMessage: 'Slack message',
      }),
    },
    {
      icon: 'bell',
      top: 86,
      label: i18n.translate('xpack.nightshift.onboarding.automate.illustrationAlert', {
        defaultMessage: 'Alert fires',
      }),
    },
  ];
  const chipWidth = 112;
  const chipHeight = 32;
  const chipLeft = 14;

  return (
    <div
      aria-hidden={true}
      css={css`
        position: relative;
        width: ${ILLUSTRATION_WIDTH}px;
        height: ${ILLUSTRATION_HEIGHT}px;
        overflow: hidden;
        border: ${euiTheme.border.thin};
        border-radius: ${euiTheme.border.radius.medium};
        background: repeating-linear-gradient(
            to bottom,
            transparent 0 38px,
            ${euiTheme.colors.borderBasePlain} 38px 39px
          ),
          linear-gradient(
            110deg,
            ${euiTheme.colors.backgroundLightSuccess},
            ${euiTheme.colors.backgroundLightPrimary} 55%,
            ${euiTheme.colors.backgroundLightAssistance}
          );
      `}
    >
      <svg
        width={ILLUSTRATION_WIDTH}
        height={ILLUSTRATION_HEIGHT}
        css={css`
          position: absolute;
          inset: 0;
        `}
      >
        {triggers.map(({ icon, top }) => {
          const startX = chipLeft + chipWidth;
          const startY = top + chipHeight / 2;
          const midX = (startX + AGENT_X) / 2;
          return (
            <path
              key={icon}
              d={`M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${AGENT_Y}, ${AGENT_X} ${AGENT_Y}`}
              fill="none"
              stroke={euiTheme.colors.primary}
              strokeWidth={2}
              strokeDasharray="4 4"
              strokeLinecap="round"
              css={css`
                animation: ${flow} 0.8s linear infinite;
                @media (prefers-reduced-motion: reduce) {
                  animation: none;
                }
              `}
            />
          );
        })}
      </svg>

      {triggers.map(({ icon, top, label }) => (
        <div
          key={icon}
          css={css`
            position: absolute;
            left: ${chipLeft}px;
            top: ${top}px;
            width: ${chipWidth}px;
            height: ${chipHeight}px;
            display: flex;
            align-items: center;
            gap: ${euiTheme.size.s};
            padding: 0 ${euiTheme.size.s};
            box-sizing: border-box;
            background: ${euiTheme.colors.backgroundBasePlain};
            border: ${euiTheme.border.thin};
            border-radius: ${euiTheme.border.radius.medium};
            ${chipShadow}
          `}
        >
          <EuiIcon type={icon} size="s" aria-hidden={true} />
          <EuiText size="xs">
            <strong>{label}</strong>
          </EuiText>
        </div>
      ))}

      <div
        css={css`
          position: absolute;
          left: ${AGENT_X - 22}px;
          top: ${AGENT_Y - 22}px;
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: ${euiTheme.colors.backgroundBasePlain};
          border: 2px solid ${euiTheme.colors.primary};
          &::before {
            content: '';
            position: absolute;
            inset: -2px;
            border-radius: 50%;
            border: 2px solid ${euiTheme.colors.primary};
            animation: ${pulse} 1.8s ease-out infinite;
          }
          @media (prefers-reduced-motion: reduce) {
            &::before {
              animation: none;
              opacity: 0;
            }
          }
        `}
      >
        <EuiIcon type="sparkles" color="primary" size="m" aria-hidden={true} />
      </div>
      <EuiText
        size="xs"
        color="subdued"
        textAlign="center"
        css={css`
          position: absolute;
          left: ${AGENT_X - 45}px;
          top: ${AGENT_Y + 30}px;
          width: 90px;
        `}
      >
        {i18n.translate('xpack.nightshift.onboarding.automate.illustrationAgent', {
          defaultMessage: 'Agent investigates',
        })}
      </EuiText>
    </div>
  );
}
