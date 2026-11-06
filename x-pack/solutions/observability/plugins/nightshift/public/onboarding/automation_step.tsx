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
  EuiButton,
  EuiCallOut,
  EuiConfirmModal,
  EuiFlexGroup,
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
import { getNightshiftCapabilities } from '@kbn/nightshift-shared';
import type { InvestigationSummary } from '@kbn/agentic-investigations-plugin/common';
import { AutomationDetailFlyout } from '../automations/detail_flyout/automation_detail_flyout';
import { CreateAutomationFlyout } from '../automations/flyouts/create_flyout/create_automation_flyout';
import { useAutomationUsage } from '../automations/hooks/use_automation_usage';
import { getDeleteConfirmTitle, listLabels } from '../automations/list/translations';
import { statusLabels } from '../automations/utils/filter_automations';
import { useDeleteAutomation, type Automation } from '../data/automations/use_automations';
import { useKibana } from '../hooks/use_kibana';

const CREATE_AUTOMATION = i18n.translate(
  'xpack.nightshift.onboarding.automate.createAutomationButton',
  { defaultMessage: 'Create automation' }
);
const TRIGGER_ALERT = i18n.translate('xpack.nightshift.onboarding.automate.triggerAlert', {
  defaultMessage: 'alert',
});
const TRIGGER_SLACK = i18n.translate('xpack.nightshift.onboarding.automate.triggerSlack', {
  defaultMessage: 'a Slack message',
});
const TRIGGER_SCHEDULE = i18n.translate('xpack.nightshift.onboarding.automate.triggerSchedule', {
  defaultMessage: 'a schedule',
});

const triggeredByLabel = (automation: Automation): string => {
  const triggers = [
    ...new Set(
      automation.trigger.rows.map((row) => {
        if (row.kind === 'slack') return TRIGGER_SLACK;
        if (row.kind === 'schedule') return TRIGGER_SCHEDULE;
        return TRIGGER_ALERT;
      })
    ),
  ];
  return i18n.translate('xpack.nightshift.onboarding.automate.triggeredBy', {
    defaultMessage: 'Triggered by {triggers}',
    values: { triggers: triggers.join(', ') || TRIGGER_ALERT },
  });
};

const triggerIcon = (automation: Automation): string => {
  const kind = automation.trigger.rows[0]?.kind;
  if (kind === 'slack') return 'logoSlack';
  if (kind === 'schedule') return 'clock';
  return 'bolt';
};

/** Step 3: the trial investigation, then the first automation and any that follow. */
export function OnboardingAutomationStep({
  investigation,
  automations,
  automationsAvailable,
  onInvestigationClick,
}: {
  investigation: InvestigationSummary;
  automations: Automation[];
  /** False when automations are unavailable in this deployment. */
  automationsAvailable: boolean;
  onInvestigationClick: (investigation: InvestigationSummary) => void;
}): React.ReactElement {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Automation>();
  const openCreate = () => setIsCreateOpen(true);
  const hasAutomation = automations.length > 0;

  return (
    <div data-test-subj="nightshiftOnboardingAutomationStep">
      {/* Section title lives above the onboarding grid so Get started lines up with this card. */}
      <TrialInvestigationCard
        investigation={investigation}
        onOpenInvestigation={onInvestigationClick}
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
      {automationsAvailable ? (
        hasAutomation ? (
          <AutomationCards automations={automations} onCreate={openCreate} onEdit={setEditing} />
        ) : (
          <FirstAutomationCard onCreate={openCreate} />
        )
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
      {isCreateOpen && (
        <CreateAutomationFlyout
          onClose={() => setIsCreateOpen(false)}
          onCreated={() => setIsCreateOpen(false)}
        />
      )}
      {editing && (
        <EditAutomationFlyout
          automation={editing}
          automations={automations}
          onClose={() => setEditing(undefined)}
        />
      )}
    </div>
  );
}

function TrialInvestigationCard({
  investigation,
  onOpenInvestigation,
}: {
  investigation: InvestigationSummary;
  onOpenInvestigation: (investigation: InvestigationSummary) => void;
}): React.ReactElement {
  const { euiTheme } = useEuiTheme();
  const InvestigationCard = useKibana().services.agenticInvestigations?.InvestigationCard;
  const { in_progress: isActive } = investigation;
  // Figma AI Background Base + AI Border Base (primary → assistance).
  const aiFill = `linear-gradient(97.76deg, ${euiTheme.colors.backgroundBasePrimary} 17%, ${euiTheme.colors.backgroundBaseAssistance} 83%)`;
  const aiBorder = `linear-gradient(97.76deg, ${euiTheme.colors.borderBasePrimary} 17%, ${euiTheme.colors.borderBaseAssistance} 83%)`;
  const borderWidth = euiTheme.border.width.thin;

  // Same radius as EuiPanel (Get started / Automations). Parent overflow clips the
  // nested card and footer so corners stay round — no negative-margin overlap.
  const panelRadius = euiTheme.border.radius.panel;

  return (
    <div
      data-test-subj="nightshiftOnboardingTrialInvestigation"
      css={css`
        box-sizing: border-box;
        overflow: hidden;
        border-radius: ${panelRadius};
        border: ${borderWidth} solid transparent;
        background-image: ${aiFill}, ${aiBorder};
        background-origin: border-box;
        background-clip: padding-box, border-box;
      `}
    >
      {InvestigationCard && (
        <div
          css={css`
            background: ${euiTheme.colors.emptyShade};

            /* Drop the card's own borders so the AI ring is the only perimeter. */
            > * {
              border: none !important;
              box-shadow: none !important;
            }
          `}
        >
          <InvestigationCard investigation={investigation} onClick={onOpenInvestigation} />
        </div>
      )}
      <EuiFlexGroup
        alignItems="center"
        gutterSize="s"
        responsive={false}
        css={css`
          padding: ${euiTheme.size.m} ${euiTheme.size.base};
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
              onClick={() => onOpenInvestigation(investigation)}
              data-test-subj="nightshiftOnboardingTrialInvestigationOpen"
            >
              {i18n.translate('xpack.nightshift.onboarding.automate.openButton', {
                defaultMessage: 'Open',
              })}
            </EuiButton>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </div>
  );
}

function FirstAutomationCard({ onCreate }: { onCreate: () => void }): React.ReactElement {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiPanel hasBorder paddingSize="l" data-test-subj="nightshiftOnboardingFirstAutomation">
      <EuiFlexGroup alignItems="center" gutterSize="xl">
        <EuiFlexItem grow={false}>
          <EuiIllustration
            type={connectedPowerPlug}
            alt=""
            data-test-subj="nightshiftOnboardingFirstAutomationIllustration"
            css={css`
              max-inline-size: ${euiTheme.base * 10}px;
            `}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h4>
              {i18n.translate('xpack.nightshift.onboarding.automate.firstAutomationTitle', {
                defaultMessage: 'Create first automation',
              })}
            </h4>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiText size="s" color="subdued">
            <p>
              {i18n.translate('xpack.nightshift.onboarding.automate.firstAutomationDescription', {
                defaultMessage:
                  "Let investigations start automatically — and don't do the same work over and over again",
              })}
            </p>
          </EuiText>
          <EuiSpacer size="m" />
          <div>
            <EuiButton
              size="s"
              fill
              iconType="plus"
              onClick={onCreate}
              data-test-subj="nightshiftOnboardingCreateAutomation"
            >
              {CREATE_AUTOMATION}
            </EuiButton>
          </div>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}

function AutomationCards({
  automations,
  onCreate,
  onEdit,
}: {
  automations: Automation[];
  onCreate: () => void;
  onEdit: (automation: Automation) => void;
}): React.ReactElement {
  const { euiTheme } = useEuiTheme();
  return (
    <div
      data-test-subj="nightshiftOnboardingAutomationCards"
      css={css`
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
        gap: ${euiTheme.size.base};
      `}
    >
      {automations.map((automation) => (
        <EuiPanel
          key={automation.id}
          hasBorder
          paddingSize="l"
          data-test-subj="nightshiftOnboardingAutomationCard"
        >
          <EuiFlexGroup justifyContent="spaceBetween" alignItems="flexStart" responsive={false}>
            <EuiFlexItem grow={false}>
              <IconTile icon={triggerIcon(automation)} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBadge color={automation.isEnabled ? 'success' : 'hollow'}>
                {automation.isEnabled ? statusLabels.enabled : statusLabels.paused}
              </EuiBadge>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="m" />
          <EuiTitle size="xs">
            <h4>{automation.name}</h4>
          </EuiTitle>
          <EuiSpacer size="xs" />
          <EuiText size="s" color="subdued">
            <p>{triggeredByLabel(automation)}</p>
          </EuiText>
          <EuiSpacer size="m" />
          <EuiButton
            size="s"
            iconType="pencil"
            onClick={() => onEdit(automation)}
            data-test-subj="nightshiftOnboardingEditAutomation"
          >
            {i18n.translate('xpack.nightshift.onboarding.automate.editAutomation', {
              defaultMessage: 'Edit automation',
            })}
          </EuiButton>
        </EuiPanel>
      ))}
      <EuiPanel hasBorder paddingSize="l" data-test-subj="nightshiftOnboardingAddAutomation">
        <IconTile icon="plus" />
        <EuiSpacer size="m" />
        <EuiTitle size="xs">
          <h4>
            {i18n.translate('xpack.nightshift.onboarding.automate.addAnotherTitle', {
              defaultMessage: 'Add one more automation',
            })}
          </h4>
        </EuiTitle>
        <EuiSpacer size="xs" />
        <EuiText size="s" color="subdued">
          <p>
            {i18n.translate('xpack.nightshift.onboarding.automate.addAnotherDescription', {
              defaultMessage:
                'Investigate alerts, Slack messages, GitHub pull requests — or run on a schedule',
            })}
          </p>
        </EuiText>
        <EuiSpacer size="m" />
        <EuiButton
          size="s"
          iconType="plus"
          onClick={onCreate}
          data-test-subj="nightshiftOnboardingCreateAutomation"
        >
          {CREATE_AUTOMATION}
        </EuiButton>
      </EuiPanel>
    </div>
  );
}

/** Same tinted plate as the leading Mark on earlier onboarding steps. */
function IconTile({ icon }: { icon: string }): React.ReactElement {
  const { euiTheme } = useEuiTheme();
  return (
    <div
      aria-hidden={true}
      css={css`
        width: ${euiTheme.size.xxl};
        height: ${euiTheme.size.xxl};
        display: flex;
        align-items: center;
        justify-content: center;
        background: ${euiTheme.colors.backgroundLightText};
        border-radius: ${euiTheme.size.s};
        color: ${euiTheme.colors.textParagraph};
      `}
    >
      <EuiIcon type={icon} size="m" aria-hidden={true} />
    </div>
  );
}

function EditAutomationFlyout({
  automation,
  automations,
  onClose,
}: {
  automation: Automation;
  automations: Automation[];
  onClose: () => void;
}): React.ReactElement {
  const { application } = useKibana().services;
  const canManage = getNightshiftCapabilities(application.capabilities.nightshift).canManage;
  const deleteAutomation = useDeleteAutomation();
  const [automationToDelete, setAutomationToDelete] = useState<Automation>();
  const [refreshedAt] = useState(() => Date.now());
  const { runRange, usedToday } = useAutomationUsage(
    automations,
    { start: 'now-48h', end: 'now' },
    refreshedAt
  );

  return (
    <>
      <AutomationDetailFlyout
        automations={automations}
        automation={automation}
        canManage={canManage}
        usedToday={usedToday.get(automation.id) ?? 0}
        runRange={runRange}
        rangeLabel={listLabels.last48Hours}
        onClose={onClose}
        onClone={() => undefined}
        onDelete={setAutomationToDelete}
      />
      {automationToDelete && (
        <EuiConfirmModal
          title={getDeleteConfirmTitle(automationToDelete.name)}
          onCancel={() => setAutomationToDelete(undefined)}
          onConfirm={() => {
            deleteAutomation.mutate(
              { id: automationToDelete.id, name: automationToDelete.name },
              {
                onSuccess: () => {
                  setAutomationToDelete(undefined);
                  onClose();
                },
              }
            );
          }}
          cancelButtonText={listLabels.cancel}
          confirmButtonText={listLabels.delete}
          buttonColor="danger"
          isLoading={deleteAutomation.isLoading}
          aria-label={getDeleteConfirmTitle(automationToDelete.name)}
        >
          <p>{listLabels.deleteBody}</p>
        </EuiConfirmModal>
      )}
    </>
  );
}
