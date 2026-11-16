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
  EuiBanner,
  EuiButton,
  EuiCallOut,
  EuiConfirmModal,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiIllustration,
  EuiLoadingSpinner,
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
import { SourceCard } from '../../../components/entities/sandbox_connector/source_card';
import { sourceGridStyles } from '../../../components/entities/sandbox_connector/source_grid_styles';
import { IconMark } from '../../../components/ui/icon_mark';
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

const FIRST_AUTOMATION_TITLE = i18n.translate(
  'xpack.nightshift.onboarding.automate.firstAutomationTitle',
  { defaultMessage: 'Create first automation' }
);

const FIRST_AUTOMATION_DESCRIPTION = i18n.translate(
  'xpack.nightshift.onboarding.automate.firstAutomationDescription',
  {
    defaultMessage:
      "Let investigations start automatically — and don't do the same work over and over again",
  }
);

/** Shared pitch on the trial card (in progress + done). */
const AUTOMATION_PITCH = i18n.translate('xpack.nightshift.onboarding.automate.automationPitch', {
  defaultMessage: "Create an automation so you don't repeat this work manually",
});
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
  isInvestigationSelected = false,
  automations,
  automationsAvailable,
  onInvestigationClick,
}: {
  investigation: InvestigationSummary;
  /** True while the trial investigation flyout is open (in progress or done). */
  isInvestigationSelected?: boolean;
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
        isSelected={isInvestigationSelected}
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
  isSelected = false,
  onOpenInvestigation,
}: {
  investigation: InvestigationSummary;
  isSelected?: boolean;
  onOpenInvestigation: (investigation: InvestigationSummary) => void;
}): React.ReactElement {
  const { euiTheme } = useEuiTheme();
  const InvestigationCard = useKibana().services.agenticInvestigations?.InvestigationCard;
  const { in_progress: isActive } = investigation;
  const investigations = useMemo(() => [investigation], [investigation]);
  const renderAssignees = useInvestigationAssignees(investigations);
  const borderWidth = euiTheme.border.width.thin;
  // EUI default card/panel radius (same as EuiPanel / EuiCard / prototype CARD_BORDER_RADIUS_PX).
  const cardRadius = euiTheme.border.radius.panel;
  // In progress: AI shell. Done: success fill + border (prototype complete trial card).
  const shellFill = isActive
    ? `linear-gradient(97.76deg, ${euiTheme.colors.backgroundBasePrimary} 17%, ${euiTheme.colors.backgroundBaseAssistance} 83%)`
    : `linear-gradient(${euiTheme.colors.backgroundBaseSuccess}, ${euiTheme.colors.backgroundBaseSuccess})`;
  const shellBorder = isActive
    ? `linear-gradient(97.76deg, ${euiTheme.colors.borderBasePrimary} 17%, ${euiTheme.colors.borderBaseAssistance} 83%)`
    : `linear-gradient(${euiTheme.colors.borderBaseSuccess}, ${euiTheme.colors.borderBaseSuccess})`;
  const cellBorder = isActive ? shellBorder : undefined;
  const selectedBorder = isActive
    ? euiTheme.colors.borderStrongAssistance
    : euiTheme.colors.borderStrongSuccess;

  return (
    <div
      data-test-subj="nightshiftOnboardingTrialInvestigation"
      css={css`
        position: relative;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        gap: ${euiTheme.size.base};
        padding: 0;
        padding-bottom: ${euiTheme.size.base};
        border-radius: ${cardRadius};
        border: ${borderWidth} solid transparent;
        background-image: ${shellFill}, ${shellBorder};
        background-origin: border-box;
        background-clip: padding-box, border-box;
        /* Keep overflow visible so the nested cell can share the shell outline. */
        overflow: visible;
      `}
    >
      {InvestigationCard && (
        <div
          css={css`
            box-sizing: border-box;
            position: relative;
            z-index: 1;
            /* Overlap the shell border on L/T/R so the two strokes read as one. */
            margin: -${borderWidth} -${borderWidth} 0;
            width: calc(100% + 2 * ${borderWidth});
            border-radius: ${cardRadius};
            overflow: hidden;
            border: ${borderWidth} solid
              ${isActive ? 'transparent' : euiTheme.colors.borderBaseSuccess};
            background-color: ${euiTheme.colors.emptyShade};
            ${cellBorder
              ? css`
                  background-image: linear-gradient(
                      ${euiTheme.colors.emptyShade},
                      ${euiTheme.colors.emptyShade}
                    ),
                    ${cellBorder};
                  background-origin: border-box;
                  background-clip: padding-box, border-box;
                `
              : ''}
            /* Solid strong ring when open — keeps panel radius (gradient can clip corners). */
            ${isSelected
              ? css`
                  border-color: ${selectedBorder};
                  background-image: none;
                  background-color: ${euiTheme.colors.emptyShade};
                `
              : ''}
          `}
        >
          <InvestigationCard
            borderless
            investigation={investigation}
            /* Outline-only selection: skip InvestigationCard's blue selected fill. */
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
        gutterSize="none"
        responsive={false}
        css={css`
          /* One step under size.m (16 → 12). */
          gap: calc(${euiTheme.size.m} - ${euiTheme.size.xs});
          padding: 0 ${euiTheme.size.base};
        `}
      >
        <EuiFlexItem grow={false}>
          {isActive ? (
            <EuiLoadingSpinner
              size="m"
              color={{
                // Kibana AI label end token (textPrimary → textAssistance).
                highlight: euiTheme.colors.textAssistance,
                border: euiTheme.colors.borderBasePlain,
              }}
            />
          ) : (
            <EuiIcon
              type="checkCircleFill"
              color="success"
              size="m"
              aria-hidden={true}
              css={css`
                inline-size: 16px;
                block-size: 16px;
              `}
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
                {i18n.translate(
                  'xpack.nightshift.onboarding.automate.investigatingAutomationHint',
                  {
                    defaultMessage:
                      "It might take up to 5 minutes. Meanwhile, create an automation so you don't repeat this work manually",
                  }
                )}
              </>
            ) : (
              <>
                <strong>
                  {i18n.translate(
                    'xpack.nightshift.onboarding.automate.investigationResultsReadyTitle',
                    {
                      defaultMessage: 'Investigation results are ready',
                    }
                  )}
                </strong>
                {' · '}
                {AUTOMATION_PITCH}
              </>
            )}
          </EuiText>
        </EuiFlexItem>
        {!isActive && (
          <EuiFlexItem grow={false}>
            <EuiButton
              size="s"
              color="success"
              onClick={() => onOpenInvestigation(investigation)}
              data-test-subj="nightshiftOnboardingTrialInvestigationOpen"
            >
              {i18n.translate('xpack.nightshift.onboarding.automate.viewResultsButton', {
                defaultMessage: 'View results',
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
  // Keep EuiToolTip (not native title / actionProps) so the manage_security reason stays
  // hover- and keyboard-discoverable — same as AutomationsPage / SourceCard.
  return (
    <EuiBanner
      size="m"
      color="plain"
      title={FIRST_AUTOMATION_TITLE}
      text={FIRST_AUTOMATION_DESCRIPTION}
      headingElement="h4"
      aria-label={FIRST_AUTOMATION_TITLE}
      data-test-subj="nightshiftOnboardingFirstAutomation"
      media={
        <EuiIllustration
          type={connectedPowerPlug}
          alt=""
          data-test-subj="nightshiftOnboardingFirstAutomationIllustration"
        />
      }
    >
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
    </EuiBanner>
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
  return (
    <div
      data-test-subj="nightshiftOnboardingAutomationCards"
      css={sourceGridStyles}
      role="list"
      aria-label={i18n.translate('xpack.nightshift.onboarding.automate.cardsLabel', {
        defaultMessage: 'Automations',
      })}
    >
      {automations.map((automation) => (
        <SourceCard
          key={automation.id}
          mark={<IconMark icon={triggerIcon(automation)} />}
          title={automation.name}
          description={triggeredByLabel(automation)}
          badge={
            <EuiBadge
              color={automation.isEnabled ? 'success' : 'hollow'}
              iconType={automation.isEnabled ? 'check' : undefined}
            >
              {automation.isEnabled ? statusLabels.enabled : statusLabels.paused}
            </EuiBadge>
          }
          data-test-subj="nightshiftOnboardingAutomationCard"
          action={{
            label: i18n.translate('xpack.nightshift.onboarding.automate.editAutomation', {
              defaultMessage: 'Edit automation',
            }),
            icon: 'pencil',
            onClick: () => onEdit(automation),
            'data-test-subj': 'nightshiftOnboardingEditAutomation',
          }}
        />
      ))}
      <SourceCard
        mark={<IconMark icon="workflow" />}
        title={i18n.translate('xpack.nightshift.onboarding.automate.addAnotherTitle', {
          defaultMessage: 'Add one more automation',
        })}
        description={i18n.translate('xpack.nightshift.onboarding.automate.addAnotherDescription', {
          defaultMessage:
            'Investigate alerts, Slack messages, GitHub pull requests — or run on a schedule',
        })}
        data-test-subj="nightshiftOnboardingAddAutomation"
        action={{
          label: CREATE_AUTOMATION,
          icon: 'plus',
          onClick: onCreate,
          // SourceCard disables whenever a reason is set (including a generic fallback).
          disabledReason: canManage
            ? undefined
            : editDisabledReason ??
              i18n.translate('xpack.nightshift.onboarding.automate.createUnavailable', {
                defaultMessage: 'You cannot create automations right now.',
              }),
          'data-test-subj': 'nightshiftOnboardingCreateAutomation',
        }}
      />
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
