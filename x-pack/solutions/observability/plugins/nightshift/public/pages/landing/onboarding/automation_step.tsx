/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import React, { useState } from 'react';
import {
  EuiBadge,
  EuiBanner,
  EuiButton,
  EuiCallOut,
  EuiFlexGrid,
  EuiFlexItem,
  EuiIcon,
  EuiIllustration,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { connectedPowerPlug } from '@elastic/eui-illustrations';
import { i18n } from '@kbn/i18n';
import { NIGHTSHIFT_APP_ID } from '@kbn/deeplinks-observability';
import type { InvestigationSummary } from '@kbn/agentic-investigations-plugin/common';
import type { Automation } from '../../../data/automations/use_automations';
import { useKibana } from '../../../hooks/use_kibana';
import { CreateAutomationFlyout } from '../../automations/flyouts/create_flyout/create_automation_flyout';
import { getTriggerDisplay } from '../../automations/utils/trigger_display';

/** Larger than the default M media slot (5 × size.base). Matches prototype. */
const AUTOMATION_BANNER_MEDIA_SIZE_PX = 120;

const ADD_ONE_MORE_ID = 'add-one-more-automation';

/** Step 3: the trial investigation keeps running while the user sets up a first automation. */
export function OnboardingAutomationStep({
  investigation,
  automations = [],
  canCreateAutomation = false,
  isSelected = false,
  onInvestigationClick,
}: {
  investigation: InvestigationSummary;
  /** Saved automations already in the space (shown after the first create). */
  automations?: Automation[];
  /** False when automations are unavailable in this deployment. */
  canCreateAutomation?: boolean;
  /** True when the investigation flyout is open for this trial. */
  isSelected?: boolean;
  onInvestigationClick: (investigation: InvestigationSummary) => void;
}): React.ReactElement {
  const [isCreateFlyoutOpen, setIsCreateFlyoutOpen] = useState(false);
  const hasSavedAutomations = automations.length > 0;

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
      <TrialInvestigationCard
        investigation={investigation}
        isSelected={isSelected}
        onClick={onInvestigationClick}
      />

      <EuiSpacer size="xl" />
      <EuiTitle size="xs">
        <h3>
          {i18n.translate('xpack.nightshift.onboarding.automate.sectionTitle', {
            defaultMessage: 'Automations',
          })}
        </h3>
      </EuiTitle>
      <EuiSpacer size="m" />
      {!canCreateAutomation ? (
        <EuiCallOut
          announceOnMount
          size="s"
          iconType="info"
          title={i18n.translate('xpack.nightshift.onboarding.automate.unavailableTitle', {
            defaultMessage: 'Automations are not available in this deployment',
          })}
        />
      ) : hasSavedAutomations ? (
        <EuiFlexGrid columns={2} gutterSize="m" data-test-subj="nightshiftOnboardingSavedAutomations">
          {automations.map((automation) => (
            <EuiFlexItem key={automation.id}>
              <SavedAutomationCard automation={automation} />
            </EuiFlexItem>
          ))}
          <EuiFlexItem>
            <AddOneMoreAutomationCard onCreate={() => setIsCreateFlyoutOpen(true)} />
          </EuiFlexItem>
        </EuiFlexGrid>
      ) : (
        <EuiBanner
          size="m"
          color="plain"
          title={i18n.translate('xpack.nightshift.onboarding.automate.bannerTitle', {
            defaultMessage: 'Create first automation',
          })}
          text={i18n.translate('xpack.nightshift.onboarding.automate.bannerDescription', {
            defaultMessage:
              "Let investigations start automatically — and don't do the same work over and over again",
          })}
          aria-label={i18n.translate('xpack.nightshift.onboarding.automate.bannerTitle', {
            defaultMessage: 'Create first automation',
          })}
          data-test-subj="nightshiftOnboardingAutomateBanner"
          css={css`
            .euiBanner__media {
              --euiBannerMediaSize: ${AUTOMATION_BANNER_MEDIA_SIZE_PX}px;
            }
          `}
          media={
            <EuiIllustration
              type={connectedPowerPlug}
              alt=""
              fullWidth
              css={css`
                display: block;
                inline-size: 100%;
                block-size: 100%;

                > svg {
                  inline-size: 100%;
                  block-size: 100%;
                }
              `}
              data-test-subj="nightshiftOnboardingAutomateBannerMedia"
            />
          }
          actionProps={{
            primary: {
              children: i18n.translate(
                'xpack.nightshift.onboarding.automate.createAutomationButton',
                { defaultMessage: 'Create automation' }
              ),
              fill: true,
              iconType: 'plus',
              onClick: () => setIsCreateFlyoutOpen(true),
              'data-test-subj': 'nightshiftOnboardingAutomateBannerCreate',
            },
          }}
        />
      )}
      {isCreateFlyoutOpen && (
        <CreateAutomationFlyout
          onClose={() => setIsCreateFlyoutOpen(false)}
          onCreated={() => setIsCreateFlyoutOpen(false)}
        />
      )}
    </div>
  );
}

function triggerDescription(automation: Automation): string {
  const row = automation.trigger.rows[0];
  if (row == null) {
    return i18n.translate('xpack.nightshift.onboarding.automate.triggeredByAlert', {
      defaultMessage: 'Triggered by alert',
    });
  }
  if (row.kind === 'slack') {
    return i18n.translate('xpack.nightshift.onboarding.automate.triggeredBySlack', {
      defaultMessage: 'Triggered by Slack',
    });
  }
  if (row.kind === 'schedule') {
    return i18n.translate('xpack.nightshift.onboarding.automate.triggeredBySchedule', {
      defaultMessage: 'Triggered by schedule',
    });
  }
  return i18n.translate('xpack.nightshift.onboarding.automate.triggeredByAlert', {
    defaultMessage: 'Triggered by alert',
  });
}

function SavedAutomationCard({ automation }: { automation: Automation }): React.ReactElement {
  const { euiTheme } = useEuiTheme();
  const { application } = useKibana().services;
  const trigger = automation.trigger.rows[0];
  const icon = trigger ? getTriggerDisplay(trigger).icon : 'logoElastic';
  const href = application.getUrlForApp(NIGHTSHIFT_APP_ID, {
    path: `/automations/${automation.id}`,
  });

  return (
    <EuiPanel
      hasBorder
      paddingSize="m"
      data-test-subj={`nightshiftOnboardingSavedAutomation-${automation.id}`}
      css={css`
        display: flex;
        flex-direction: column;
        height: 100%;
        gap: ${euiTheme.size.m};
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
        <EuiIcon type={icon} size="m" aria-hidden={true} />
      </div>
      <div
        css={css`
          display: flex;
          flex-direction: column;
          gap: ${euiTheme.size.xs};
          flex: 1 1 auto;
          min-width: 0;
        `}
      >
        <EuiText size="s">
          <strong className="eui-textTruncate" title={automation.name}>
            {automation.name.trim() ||
              i18n.translate('xpack.nightshift.onboarding.automate.untitledAutomation', {
                defaultMessage: 'Automation',
              })}
          </strong>
        </EuiText>
        <EuiText size="xs" color="subdued">
          {triggerDescription(automation)}
        </EuiText>
        <div>
          {automation.isEnabled ? (
            <EuiBadge color="hollow">
              {i18n.translate('xpack.nightshift.onboarding.automate.enabledBadge', {
                defaultMessage: 'Enabled',
              })}
            </EuiBadge>
          ) : (
            <EuiBadge color="hollow">
              {i18n.translate('xpack.nightshift.onboarding.automate.pausedBadge', {
                defaultMessage: 'Paused',
              })}
            </EuiBadge>
          )}
        </div>
      </div>
      <div>
        <EuiButton
          size="s"
          color="text"
          iconType="pencil"
          href={href}
          onClick={(event: React.MouseEvent) => {
            event.preventDefault();
            void application.navigateToUrl(href);
          }}
          data-test-subj={`nightshiftOnboardingEditAutomation-${automation.id}`}
        >
          {i18n.translate('xpack.nightshift.onboarding.automate.editButton', {
            defaultMessage: 'Edit automation',
          })}
        </EuiButton>
      </div>
    </EuiPanel>
  );
}

function AddOneMoreAutomationCard({ onCreate }: { onCreate: () => void }): React.ReactElement {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiPanel
      hasBorder
      paddingSize="m"
      data-test-subj={`nightshiftOnboardingSavedAutomation-${ADD_ONE_MORE_ID}`}
      css={css`
        display: flex;
        flex-direction: column;
        height: 100%;
        gap: ${euiTheme.size.m};
      `}
    >
      <div
        css={css`
          align-items: center;
          background: ${euiTheme.colors.backgroundBaseSubdued};
          border-radius: ${euiTheme.border.radius.medium};
          display: flex;
          height: ${euiTheme.size.xxl};
          justify-content: center;
          width: ${euiTheme.size.xxl};
        `}
      >
        <EuiIcon type="plus" size="m" aria-hidden={true} />
      </div>
      <div
        css={css`
          display: flex;
          flex-direction: column;
          gap: ${euiTheme.size.xs};
          flex: 1 1 auto;
          min-width: 0;
        `}
      >
        <EuiText size="s">
          <strong>
            {i18n.translate('xpack.nightshift.onboarding.automate.addOneMoreTitle', {
              defaultMessage: 'Add one more automation',
            })}
          </strong>
        </EuiText>
        <EuiText size="xs" color="subdued">
          {i18n.translate('xpack.nightshift.onboarding.automate.addOneMoreDescription', {
            defaultMessage:
              'Investigate alerts, Slack messages, GitHub pull requests — or run on a schedule',
          })}
        </EuiText>
      </div>
      <div>
        <EuiButton
          size="s"
          color="text"
          iconType="plus"
          onClick={onCreate}
          data-test-subj="nightshiftOnboardingAddOneMoreAutomation"
        >
          {i18n.translate('xpack.nightshift.onboarding.automate.createAutomationButton', {
            defaultMessage: 'Create automation',
          })}
        </EuiButton>
      </div>
    </EuiPanel>
  );
}

/**
 * Prototype-matched trial card: AI/success shell around the investigation row +
 * callout-style status message (spinner while running, ready copy when done).
 */
function TrialInvestigationCard({
  investigation,
  isSelected = false,
  onClick,
}: {
  investigation: InvestigationSummary;
  isSelected?: boolean;
  onClick: (investigation: InvestigationSummary) => void;
}): React.ReactElement {
  const { euiTheme } = useEuiTheme();
  const InvestigationCard = useKibana().services.agenticInvestigations?.InvestigationCard;
  const { in_progress: isActive } = investigation;

  const borderWidth = euiTheme.border.width.thin;
  const radius = euiTheme.border.radius.panel;
  const aiFill = `linear-gradient(
    97.76deg,
    ${euiTheme.colors.backgroundBasePrimary} 17%,
    ${euiTheme.colors.backgroundBaseAssistance} 83%
  )`;
  const aiBorder = `linear-gradient(
    97.76deg,
    ${euiTheme.colors.borderBasePrimary} 17%,
    ${euiTheme.colors.borderBaseAssistance} 83%
  )`;

  const shellCss = css`
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: ${euiTheme.size.base};
    padding: 0;
    padding-bottom: ${euiTheme.size.base};
    border-radius: ${radius};
    border: ${borderWidth} solid transparent;
    background-image: ${isActive
      ? `${aiFill}, ${aiBorder}`
      : `linear-gradient(
          ${euiTheme.colors.backgroundBaseSuccess},
          ${euiTheme.colors.backgroundBaseSuccess}
        ),
        linear-gradient(
          ${euiTheme.colors.borderBaseSuccess},
          ${euiTheme.colors.borderBaseSuccess}
        )`};
    background-origin: border-box;
    background-clip: padding-box, border-box;
    overflow: visible;
  `;

  const cardCss = css`
    box-sizing: border-box;
    position: relative;
    z-index: 1;
    margin: -${borderWidth} -${borderWidth} 0;
    width: calc(100% + 2 * ${borderWidth});
    border-radius: ${radius};
    overflow: hidden;
    ${isSelected
      ? `
      /* Solid stronger ring when the flyout is open — avoids gradient clipping the radius. */
      border: ${borderWidth} solid ${
        isActive
          ? euiTheme.colors.borderStrongAssistance
          : euiTheme.colors.borderStrongSuccess
      };
      background-image: none;
      background-color: ${euiTheme.colors.emptyShade};
      box-shadow: none;
    `
      : isActive
      ? `
      border: ${borderWidth} solid transparent;
      background-image: linear-gradient(
          ${euiTheme.colors.emptyShade},
          ${euiTheme.colors.emptyShade}
        ),
        ${aiBorder};
      background-origin: border-box;
      background-clip: padding-box, border-box;
    `
      : `
      border: ${borderWidth} solid ${euiTheme.colors.borderBaseSuccess};
      background-color: ${euiTheme.colors.emptyShade};
    `}
  `;

  const messageCopyCss = css`
    margin: 0;
    min-width: 0;
    flex: 1 1 auto;

    .euiTitle {
      display: inline;
      margin: 0 ${euiTheme.size.xxs} 0 0 !important;
      color: ${euiTheme.colors.textHeading};
    }

    .euiCallOut__text {
      display: inline;
      margin: 0;

      > * {
        display: inline;
      }

      &::before {
        content: '\\00B7';
        display: inline-block;
        inline-size: calc(${euiTheme.size.s} + ${euiTheme.size.xxs});
        text-align: center;
        color: ${euiTheme.colors.textHeading};
      }
    }
  `;

  return (
    <div css={shellCss} data-test-subj="nightshiftOnboardingTrialInvestigation">
      <div css={cardCss}>
        {InvestigationCard && (
          <InvestigationCard
            investigation={investigation}
            isSelected={isSelected}
            onClick={onClick}
          />
        )}
      </div>
      {isActive ? (
        <div
          css={css`
            margin: 0;
            display: flex;
            align-items: flex-start;
            gap: ${euiTheme.size.s};
            padding: 0 ${euiTheme.size.base} 0 20px;
          `}
          data-test-subj="nightshiftOnboardingTrialInvestigationStatus"
        >
          <EuiLoadingSpinner
            size="m"
            aria-label={i18n.translate(
              'xpack.nightshift.onboarding.automate.investigatingSpinnerAria',
              { defaultMessage: 'Investigation in progress' }
            )}
          />
          <div css={messageCopyCss}>
            <EuiTitle size="xxs">
              <span>
                {i18n.translate('xpack.nightshift.onboarding.automate.investigatingTitle', {
                  defaultMessage: 'Agent is investigating',
                })}
              </span>
            </EuiTitle>
            <EuiText size="s" className="euiCallOut__text">
              <p>
                {i18n.translate('xpack.nightshift.onboarding.automate.investigatingDescription', {
                  defaultMessage:
                    'It might take up to 5 minutes. Meanwhile, create an automation for future investigations.',
                })}
              </p>
            </EuiText>
          </div>
        </div>
      ) : (
        <div
          css={css`
            margin: 0;
            display: flex;
            align-items: flex-start;
            gap: ${euiTheme.size.s};
            padding: 0 ${euiTheme.size.base} 0 20px;
          `}
          data-test-subj="nightshiftOnboardingTrialInvestigationStatus"
        >
          <div css={messageCopyCss}>
            <EuiTitle size="xxs">
              <span>
                {i18n.translate('xpack.nightshift.onboarding.automate.completedTitle', {
                  defaultMessage: 'Results are ready',
                })}
              </span>
            </EuiTitle>
            <EuiText size="s" className="euiCallOut__text">
              <p>
                {i18n.translate('xpack.nightshift.onboarding.automate.completedDescription', {
                  defaultMessage:
                    "You can automate it so that it's always investigated once this alert fires.",
                })}
              </p>
            </EuiText>
          </div>
        </div>
      )}
    </div>
  );
}
