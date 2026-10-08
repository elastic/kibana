/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import React from 'react';
import {
  EuiButton,
  EuiCallOut,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type {
  ListInvestigationItem,
  OnboardingConnectorSummary,
} from '@kbn/nightshift-investigations-plugin/common';
import { useKibana } from '../hooks/use_kibana';
import { InvestigationListItem } from '../investigation/investigation_list_item';
import { ONBOARDING_CONNECTOR_TYPES } from './use_onboarding';

interface SuggestedAutomation {
  id: string;
  icon: string;
  title: string;
  description: string;
  /** Only suggested when a connector of this type is connected. */
  requiresConnectorType?: string;
}

const SUGGESTED_AUTOMATIONS: SuggestedAutomation[] = [
  {
    id: 'triage_alerts',
    icon: 'bell',
    title: i18n.translate('xpack.nightshift.onboarding.automate.triageAlertsTitle', {
      defaultMessage: 'Triage incoming alerts',
    }),
    description: i18n.translate('xpack.nightshift.onboarding.automate.triageAlertsDescription', {
      defaultMessage: 'Investigate new alerts from your deployments as soon as they fire.',
    }),
  },
  {
    id: 'daily_health_check',
    icon: 'clock',
    title: i18n.translate('xpack.nightshift.onboarding.automate.dailyCheckTitle', {
      defaultMessage: 'Daily health check',
    }),
    description: i18n.translate('xpack.nightshift.onboarding.automate.dailyCheckDescription', {
      defaultMessage:
        'Every morning, look for new errors, latency regressions and violated SLOs from the night.',
    }),
  },
  {
    id: 'triage_slack',
    icon: 'logoSlack',
    title: i18n.translate('xpack.nightshift.onboarding.automate.slackTitle', {
      defaultMessage: 'Triage alerts posted in Slack',
    }),
    description: i18n.translate('xpack.nightshift.onboarding.automate.slackDescription', {
      defaultMessage:
        'Start from Slack messages that look like alerts, then reply in the same thread with findings.',
    }),
    requiresConnectorType: ONBOARDING_CONNECTOR_TYPES.slack,
  },
  {
    id: 'review_changes',
    icon: 'logoGithub',
    title: i18n.translate('xpack.nightshift.onboarding.automate.githubTitle', {
      defaultMessage: 'Check recent releases',
    }),
    description: i18n.translate('xpack.nightshift.onboarding.automate.githubDescription', {
      defaultMessage:
        'After a release or merged pull request, check the affected services for new errors.',
    }),
    requiresConnectorType: ONBOARDING_CONNECTOR_TYPES.github,
  },
];

/** Step 3: the trial investigation keeps running while the user sets up a first automation. */
export function OnboardingAutomationStep({
  investigation,
  connectors,
  automationsHref,
  onInvestigationClick,
}: {
  investigation: ListInvestigationItem;
  connectors: OnboardingConnectorSummary[];
  /** Unset when automations are unavailable. */
  automationsHref?: string;
  onInvestigationClick: (investigation: ListInvestigationItem) => void;
}): React.ReactElement {
  const connectedTypes = new Set(connectors.map(({ connector_type_id: typeId }) => typeId));
  const automations = SUGGESTED_AUTOMATIONS.filter(
    ({ requiresConnectorType }) =>
      !requiresConnectorType || connectedTypes.has(requiresConnectorType)
  );

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
            defaultMessage: 'Suggested automations',
          })}
        </h3>
      </EuiTitle>
      <EuiSpacer size="m" />
      {automationsHref ? (
        <EuiFlexGrid columns={2} gutterSize="m">
          {automations.map((automation) => (
            <EuiFlexItem key={automation.id}>
              <SuggestedAutomationCard automation={automation} href={automationsHref} />
            </EuiFlexItem>
          ))}
        </EuiFlexGrid>
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
  investigation: ListInvestigationItem;
  onClick: (investigation: ListInvestigationItem) => void;
}): React.ReactElement {
  const { euiTheme } = useEuiTheme();
  const { status } = investigation;
  const isActive = status === 'pending' || status === 'running';

  return (
    <EuiPanel
      hasBorder
      paddingSize="none"
      data-test-subj="nightshiftOnboardingTrialInvestigation"
      css={css`
        overflow: hidden;
      `}
    >
      <InvestigationListItem investigation={investigation} onClick={onClick} />
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
            <EuiIcon
              type={status === 'completed' ? 'checkCircleFill' : 'warning'}
              color={status === 'completed' ? 'success' : 'warning'}
              aria-hidden={true}
            />
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
            ) : status === 'completed' ? (
              <strong>
                {i18n.translate('xpack.nightshift.onboarding.automate.completedTitle', {
                  defaultMessage: 'Results are ready',
                })}
              </strong>
            ) : (
              <strong>
                {i18n.translate('xpack.nightshift.onboarding.automate.failedTitle', {
                  defaultMessage: 'The investigation did not finish',
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

function SuggestedAutomationCard({
  automation,
  href,
}: {
  automation: SuggestedAutomation;
  href: string;
}): React.ReactElement {
  const { euiTheme } = useEuiTheme();
  const { application } = useKibana().services;
  return (
    <EuiPanel
      hasBorder
      paddingSize="m"
      data-test-subj={`nightshiftOnboardingSuggestedAutomation-${automation.id}`}
      css={css`
        display: flex;
        flex-direction: column;
        height: 100%;
      `}
    >
      <div
        css={css`
          align-items: center;
          border: ${euiTheme.border.thin};
          border-radius: ${euiTheme.border.radius.medium};
          display: flex;
          height: ${euiTheme.size.xxl};
          justify-content: center;
          width: ${euiTheme.size.xxl};
        `}
      >
        <EuiIcon type={automation.icon} size="m" aria-hidden={true} />
      </div>
      <EuiSpacer size="m" />
      <EuiText size="s">
        <strong>{automation.title}</strong>
      </EuiText>
      <EuiText
        size="xs"
        color="subdued"
        css={css`
          flex-grow: 1;
        `}
      >
        {automation.description}
      </EuiText>
      <EuiSpacer size="m" />
      <div>
        <EuiButton
          size="s"
          color="text"
          href={href}
          onClick={(event: React.MouseEvent) => {
            event.preventDefault();
            void application.navigateToUrl(href);
          }}
          data-test-subj={`nightshiftOnboardingSetUpAutomation-${automation.id}`}
        >
          {i18n.translate('xpack.nightshift.onboarding.automate.setUpButton', {
            defaultMessage: 'Set up',
          })}
        </EuiButton>
      </div>
    </EuiPanel>
  );
}
