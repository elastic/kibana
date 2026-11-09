/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import React, { useMemo, useState } from 'react';
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
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { connectedPowerPlug } from '@elastic/eui-illustrations';
import { i18n } from '@kbn/i18n';
import { getNightshiftCapabilities } from '@kbn/nightshift-shared';
import type { InvestigationSummary } from '@kbn/agentic-investigations-plugin/common';
import { NIGHTSHIFT_EBT_ELEMENTS } from '../../../common/ebt_constants';
import { InvestigationCardActions } from '../../../components/entities/investigation/investigation_card_actions';
import { useInvestigationAssignees } from '../../../components/entities/investigation/use_investigation_assignees';
import {
  useCreateAutomation,
  useDeleteAutomation,
  useRunAutomation,
  type Automation,
} from '../../../data/automations/use_automations';
import { useInvestigatorServiceAccount } from '../../../data/service_accounts/use_investigator_service_account';
import { useKibana } from '../../../hooks/use_kibana';
import { AutomationDetailFlyout } from '../../automations/detail_flyout/automation_detail_flyout';
import { CreateAutomationFlyout } from '../../automations/flyouts/create_flyout/create_automation_flyout';
import { useAutomationUsage } from '../../automations/hooks/use_automation_usage';
import { getDeleteConfirmTitle, listLabels } from '../../automations/list/translations';
import { toCloneRequestBody } from '../../automations/utils/clone_automation';
import { MANAGE_SECURITY_REQUIRED_REASON } from '../../automations/utils/edit_permission';
import { statusLabels } from '../../automations/utils/filter_automations';

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
  const [editingId, setEditingId] = useState<string>();
  // Owned here so prev/next remounts of the flyout keep Overview vs Run history.
  const [editingRunsTab, setEditingRunsTab] = useState(false);
  // Resolve from the latest list so a save that refreshes automations updates the flyout.
  const editing = automations.find((automation) => automation.id === editingId);
  const { canManage, editDisabledReason } = useOnboardingAutomationPermissions();
  const openCreate = () => {
    if (!canManage) return;
    setIsCreateOpen(true);
  };
  const openEdit = (automation: Automation) => {
    setEditingRunsTab(false);
    setEditingId(automation.id);
  };
  const closeEdit = () => {
    setEditingId(undefined);
    setEditingRunsTab(false);
  };
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
          <AutomationCards
            automations={automations}
            onCreate={openCreate}
            onEdit={openEdit}
            canManage={canManage}
            editDisabledReason={editDisabledReason}
          />
        ) : (
          <FirstAutomationCard
            onCreate={openCreate}
            canManage={canManage}
            editDisabledReason={editDisabledReason}
          />
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
      {isCreateOpen && canManage && (
        <CreateAutomationFlyout
          onClose={() => setIsCreateOpen(false)}
          onCreated={() => setIsCreateOpen(false)}
        />
      )}
      {editing && (
        <EditAutomationFlyout
          key={editing.id}
          automation={editing}
          automations={automations}
          canManage={canManage}
          editDisabledReason={editDisabledReason}
          embeddedRunsTab={editingRunsTab}
          onEmbeddedRunsTabChange={setEditingRunsTab}
          onSelectAutomation={(automation) => setEditingId(automation.id)}
          onClose={closeEdit}
        />
      )}
    </div>
  );
}

/** Same manage_security gate as AutomationsPage: writes bind to the space service account. */
function useOnboardingAutomationPermissions(): {
  canManage: boolean;
  editDisabledReason?: string;
} {
  const { application } = useKibana().services;
  const hasManagePrivilege = getNightshiftCapabilities(
    application.capabilities.nightshift
  ).canManage;
  const { data: serviceAccount } = useInvestigatorServiceAccount();
  const needsManageSecurity = serviceAccount?.serviceAccountsEnabled === true;
  const canManage =
    hasManagePrivilege &&
    serviceAccount !== undefined &&
    (!needsManageSecurity || serviceAccount.canModifyBoundWorkflows === true);
  const editDisabledReason =
    hasManagePrivilege && needsManageSecurity && !canManage
      ? MANAGE_SECURITY_REQUIRED_REASON
      : undefined;
  return { canManage, editDisabledReason };
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
  const investigations = useMemo(() => [investigation], [investigation]);
  const renderAssignees = useInvestigationAssignees(investigations);
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
          `}
        >
          <InvestigationCard
            borderless
            investigation={investigation}
            onClick={onOpenInvestigation}
            actions={
              <InvestigationCardActions
                investigation={investigation}
                assignees={renderAssignees(investigation)}
                ebtElement={NIGHTSHIFT_EBT_ELEMENTS.ONBOARDING_TRIAL_INVESTIGATION}
              />
            }
          />
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

function FirstAutomationCard({
  onCreate,
  canManage,
  editDisabledReason,
}: {
  onCreate: () => void;
  canManage: boolean;
  editDisabledReason?: string;
}): React.ReactElement {
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
            <EuiToolTip content={editDisabledReason}>
              <EuiButton
                size="s"
                fill
                iconType="plus"
                onClick={onCreate}
                isDisabled={!canManage}
                data-test-subj="nightshiftOnboardingCreateAutomation"
              >
                {CREATE_AUTOMATION}
              </EuiButton>
            </EuiToolTip>
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
  canManage,
  editDisabledReason,
}: {
  automations: Automation[];
  onCreate: () => void;
  onEdit: (automation: Automation) => void;
  canManage: boolean;
  editDisabledReason?: string;
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
        <EuiToolTip content={editDisabledReason}>
          <EuiButton
            size="s"
            iconType="plus"
            onClick={onCreate}
            isDisabled={!canManage}
            data-test-subj="nightshiftOnboardingCreateAutomation"
          >
            {CREATE_AUTOMATION}
          </EuiButton>
        </EuiToolTip>
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
  canManage,
  editDisabledReason,
  embeddedRunsTab,
  onEmbeddedRunsTabChange,
  onSelectAutomation,
  onClose,
}: {
  automation: Automation;
  automations: Automation[];
  canManage: boolean;
  editDisabledReason?: string;
  embeddedRunsTab: boolean;
  onEmbeddedRunsTabChange: (isRunsTab: boolean) => void;
  onSelectAutomation: (automation: Automation) => void;
  onClose: () => void;
}): React.ReactElement {
  const deleteAutomation = useDeleteAutomation();
  const cloneAutomation = useCreateAutomation(true);
  const runAutomation = useRunAutomation();
  const [automationToDelete, setAutomationToDelete] = useState<Automation>();
  const [refreshedAt, setRefreshedAt] = useState(() => Date.now());
  const { runRange, usedToday } = useAutomationUsage(
    automations,
    { start: 'now-48h', end: 'now' },
    refreshedAt
  );
  const cloneNames = automations.map(({ name }) => name);

  return (
    <>
      <AutomationDetailFlyout
        embedded
        embeddedRunsTab={embeddedRunsTab}
        onEmbeddedRunsTabChange={onEmbeddedRunsTabChange}
        automations={automations}
        automation={automation}
        canManage={canManage}
        editDisabledReason={editDisabledReason}
        usedToday={usedToday.get(automation.id) ?? 0}
        runRange={runRange}
        rangeLabel={listLabels.last48Hours}
        onClose={onClose}
        onSelectAutomation={onSelectAutomation}
        onRun={(source) =>
          runAutomation.mutate(source, { onSuccess: () => setRefreshedAt(Date.now()) })
        }
        isRunPending={runAutomation.isLoading}
        onClone={
          canManage
            ? (source) =>
                cloneAutomation.mutate(toCloneRequestBody(source, cloneNames), {
                  onSuccess: ({ id: copyId }) => {
                    // List refresh from the mutation picks up the copy; select it by id.
                    onSelectAutomation({ ...source, id: copyId });
                  },
                })
            : undefined
        }
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
