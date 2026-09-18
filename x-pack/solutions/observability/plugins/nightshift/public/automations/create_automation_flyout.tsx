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
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCallOut,
  EuiCheckbox,
  EuiFieldNumber,
  EuiFieldText,
  EuiFilterButton,
  EuiFilterGroup,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormLabel,
  EuiFormRow,
  EuiHorizontalRule,
  EuiIcon,
  EuiListGroup,
  EuiListGroupItem,
  EuiPanel,
  EuiPopover,
  EuiRadioGroup,
  EuiSpacer,
  EuiText,
  EuiTextArea,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useCreateAutomation } from '../hooks/use_create_automation';
import { useUpdateAutomation } from '../hooks/use_update_automation';
import type { AutomationRecord } from '../hooks/use_fetch_automations';

type TriggerKind = 'significant_event' | 'alert';
type AlertStatus = 'any' | 'firing' | 'recovered';

const VALID_SEVERITIES = ['80-critical', '60-high', '40-medium', '20-low'] as const;
type SeverityValue = (typeof VALID_SEVERITIES)[number];

const ALERT_STATUS_VALUES = ['any', 'firing', 'recovered'] as const;
function isAlertStatus(id: string): id is AlertStatus {
  return (ALERT_STATUS_VALUES as readonly string[]).includes(id);
}

function isSeverityValue(id: string): id is SeverityValue {
  return (VALID_SEVERITIES as readonly string[]).includes(id);
}

interface TriggerEntry {
  id: string;
  kind: TriggerKind;
  // significant_event
  severities: SeverityValue[];
  // alert
  ruleNamePattern: string;
  alertStatus: AlertStatus;
  tags: string[];
}

let nextId = 1;
const makeId = () => String(nextId++);
const makeTrigger = (kind: TriggerKind): TriggerEntry => ({
  id: makeId(),
  kind,
  severities: [],
  ruleNamePattern: '',
  alertStatus: 'any',
  tags: [],
});

/** Converts stored trigger rows back to editable TriggerEntry objects for the form. */
function triggerRowsToEntries(rows: AutomationRecord['trigger']['rows']): TriggerEntry[] {
  const result: TriggerEntry[] = [];
  for (const row of rows) {
    if (row.kind === 'significant_event') {
      const rawSeverities = row.severities ?? [];
      const severities = rawSeverities.filter(isSeverityValue);
      result.push({
        id: makeId(),
        kind: 'significant_event',
        severities,
        ruleNamePattern: '',
        alertStatus: 'any',
        tags: [],
      });
    } else if (row.kind === 'alert') {
      const rawAlertStatus = row.alertStatus ?? 'any';
      result.push({
        id: makeId(),
        kind: 'alert',
        severities: [],
        ruleNamePattern: row.ruleNamePattern ?? '',
        alertStatus: isAlertStatus(rawAlertStatus) ? rawAlertStatus : 'any',
        tags: row.tags ?? [],
      });
    }
    // 'schedule' triggers are not editable in the UI — skip them; the caller shows a warning.
  }
  return result;
}

const SEVERITY_OPTIONS: Array<{ id: SeverityValue; label: string }> = [
  { id: '80-critical', label: 'Critical' },
  { id: '60-high', label: 'High' },
  { id: '40-medium', label: 'Medium' },
  { id: '20-low', label: 'Low' },
];

const ALERT_STATUS_LABELS: Record<AlertStatus, string> = {
  any: 'Any status',
  firing: 'Active',
  recovered: 'Recovered',
};

function severityLabel(selected: SeverityValue[]): string {
  if (selected.length === 0) return 'Any severity';
  return selected
    .map((id) => SEVERITY_OPTIONS.find((o) => o.id === id)?.label ?? id)
    .join(', ');
}

// ── Severity pill ────────────────────────────────────────────────────────────

function SeverityPill({
  selected,
  onChange,
}: {
  selected: SeverityValue[];
  onChange: (v: SeverityValue[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const prefix = React.useId();

  return (
    <EuiPopover
      isOpen={open}
      closePopover={() => setOpen(false)}
      panelPaddingSize="s"
      button={
        <EuiFilterGroup compressed>
          <EuiFilterButton
            hasActiveFilters={selected.length > 0}
            onClick={() => setOpen(!open)}
          >
            {severityLabel(selected)}
          </EuiFilterButton>
        </EuiFilterGroup>
      }
    >
      <div css={css`min-width: 130px; display: flex; flex-direction: column; gap: 6px;`}>
        {SEVERITY_OPTIONS.map((opt) => (
          <EuiCheckbox
            key={opt.id}
            id={`${prefix}-sev-${opt.id}`}
            label={opt.label}
            checked={selected.includes(opt.id)}
            onChange={(e) => {
              if (e.target.checked) {
                onChange([...selected, opt.id]);
              } else {
                onChange(selected.filter((s) => s !== opt.id));
              }
            }}
          />
        ))}
      </div>
    </EuiPopover>
  );
}

// ── Rule name pill ───────────────────────────────────────────────────────────

function RuleNamePill({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const trimmed = value.trim();

  return (
    <EuiPopover
      isOpen={open}
      closePopover={() => setOpen(false)}
      panelPaddingSize="s"
      button={
        <EuiFilterGroup compressed>
          <EuiFilterButton hasActiveFilters={trimmed.length > 0} onClick={() => setOpen(!open)}>
            {trimmed.length > 0 ? `Rule contains "${trimmed}"` : 'Any rule'}
          </EuiFilterButton>
        </EuiFilterGroup>
      }
    >
      <div css={css`min-width: 220px;`}>
        <EuiFieldText
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Rule name contains..."
          compressed
          autoFocus
          data-test-subj="nightshiftAutomationRulePattern"
        />
      </div>
    </EuiPopover>
  );
}

// ── Alert status pill ────────────────────────────────────────────────────────

function AlertStatusPill({
  value,
  onChange,
}: {
  value: AlertStatus;
  onChange: (v: AlertStatus) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <EuiPopover
      isOpen={open}
      closePopover={() => setOpen(false)}
      panelPaddingSize="s"
      button={
        <EuiFilterGroup compressed>
          <EuiFilterButton hasActiveFilters={value !== 'any'} onClick={() => setOpen(!open)}>
            {ALERT_STATUS_LABELS[value]}
          </EuiFilterButton>
        </EuiFilterGroup>
      }
    >
      <EuiRadioGroup
        options={[
          { id: 'any', label: 'Any status' },
          { id: 'firing', label: 'Active' },
          { id: 'recovered', label: 'Recovered' },
        ]}
        idSelected={value}
        onChange={(id) => {
          if (isAlertStatus(id)) {
            onChange(id);
            setOpen(false);
          }
        }}
      />
    </EuiPopover>
  );
}

// ── Tags pill ────────────────────────────────────────────────────────────────

function TagsPill({
  tags,
  onChange,
}: {
  tags: string[];
  onChange: (v: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const { euiTheme } = useEuiTheme();

  const addTag = () => {
    const trimmed = input.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
    }
    setInput('');
  };

  const removeTag = (tag: string) => onChange(tags.filter((t) => t !== tag));

  const pillLabel =
    tags.length === 0 ? 'Any tags' : tags.length === 1 ? `Tag: ${tags[0]}` : `Tags: ${tags.join(', ')}`;

  return (
    <EuiPopover
      isOpen={open}
      closePopover={() => setOpen(false)}
      panelPaddingSize="s"
      button={
        <EuiFilterGroup compressed>
          <EuiFilterButton hasActiveFilters={tags.length > 0} onClick={() => setOpen(!open)}>
            {pillLabel}
          </EuiFilterButton>
        </EuiFilterGroup>
      }
    >
      <div css={css`min-width: 220px; display: flex; flex-direction: column; gap: ${euiTheme.size.s};`}>
        {tags.length > 0 && (
          <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
            {tags.map((tag) => (
              <EuiFlexItem key={tag} grow={false}>
                <EuiBadge
                  iconType="cross"
                  iconSide="right"
                  iconOnClickAriaLabel={`Remove tag ${tag}`}
                  iconOnClick={() => removeTag(tag)}
                >
                  {tag}
                </EuiBadge>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        )}
        <EuiFlexGroup gutterSize="s" responsive={false}>
          <EuiFlexItem>
            <EuiFieldText
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addTag();
                }
              }}
              placeholder="Add tag..."
              compressed
              autoFocus
              data-test-subj="nightshiftAutomationTagInput"
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty size="s" onClick={addTag} isDisabled={input.trim().length === 0}>
              Add
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    </EuiPopover>
  );
}

// ── Trigger row ──────────────────────────────────────────────────────────────

function TriggerRow({
  trigger,
  onChange,
  onRemove,
}: {
  trigger: TriggerEntry;
  onChange: (patch: Partial<TriggerEntry>) => void;
  onRemove: () => void;
}) {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexGroup
      alignItems="center"
      gutterSize="s"
      responsive={false}
      wrap
      css={css`
        padding: ${euiTheme.size.s} ${euiTheme.size.m};
        min-height: 44px;
      `}
    >
      <EuiFlexItem grow={false}>
        <EuiIcon
          type={trigger.kind === 'significant_event' ? 'bell' : 'alert'}
          color="subdued"
          size="m"
        />
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiText size="s">
          <strong>
            {trigger.kind === 'significant_event'
              ? i18n.translate('xpack.nightshift.automations.triggerKind.significantEvent', {
                  defaultMessage: 'Significant event',
                })
              : i18n.translate('xpack.nightshift.automations.triggerKind.alert', {
                  defaultMessage: 'Alert',
                })}
          </strong>
        </EuiText>
      </EuiFlexItem>

      {trigger.kind === 'significant_event' && (
        <EuiFlexItem grow={false}>
          <SeverityPill
            selected={trigger.severities}
            onChange={(severities) => onChange({ severities })}
          />
        </EuiFlexItem>
      )}

      {trigger.kind === 'alert' && (
        <>
          <EuiFlexItem grow={false}>
            <RuleNamePill
              value={trigger.ruleNamePattern}
              onChange={(ruleNamePattern) => onChange({ ruleNamePattern })}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <AlertStatusPill
              value={trigger.alertStatus}
              onChange={(alertStatus) => onChange({ alertStatus })}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <TagsPill
              tags={trigger.tags}
              onChange={(tags) => onChange({ tags })}
            />
          </EuiFlexItem>
        </>
      )}

      <EuiFlexItem />

      <EuiFlexItem grow={false}>
        <EuiButtonIcon
          iconType="trash"
          color="text"
          size="xs"
          aria-label={i18n.translate(
            'xpack.nightshift.automations.createFlyout.removeTriggerAriaLabel',
            { defaultMessage: 'Remove trigger' }
          )}
          onClick={onRemove}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

// ── Trigger type picker ──────────────────────────────────────────────────────

function TriggerTypePicker({ onSelect }: { onSelect: (kind: TriggerKind) => void }) {
  const [open, setOpen] = useState(false);
  const { euiTheme } = useEuiTheme();

  return (
    <EuiPopover
      isOpen={open}
      closePopover={() => setOpen(false)}
      panelPaddingSize="none"
      button={
        <EuiButtonEmpty
          iconType="plus"
          size="s"
          flush="left"
          onClick={() => setOpen(!open)}
          css={css`padding: ${euiTheme.size.s} ${euiTheme.size.m};`}
          data-test-subj="nightshiftAddTrigger"
        >
          {i18n.translate('xpack.nightshift.automations.createFlyout.addTriggerButton', {
            defaultMessage: 'Add trigger',
          })}
        </EuiButtonEmpty>
      }
    >
      <EuiListGroup>
        <EuiListGroupItem
          iconType="bell"
          label={i18n.translate('xpack.nightshift.automations.triggerOption.significantEvent', {
            defaultMessage: 'Significant event',
          })}
          onClick={() => {
            onSelect('significant_event');
            setOpen(false);
          }}
        />
        <EuiListGroupItem
          iconType="alert"
          label={i18n.translate('xpack.nightshift.automations.triggerOption.alert', {
            defaultMessage: 'Alert',
          })}
          onClick={() => {
            onSelect('alert');
            setOpen(false);
          }}
        />
      </EuiListGroup>
    </EuiPopover>
  );
}

// ── Main flyout ──────────────────────────────────────────────────────────────

export interface AutomationFlyoutProps {
  onClose: () => void;
  /** Called after a successful save (create or update). */
  onSaved?: () => void;
  /** When provided, the flyout operates in edit mode. */
  automation?: AutomationRecord;
}

export function AutomationFlyout({
  onClose,
  onSaved,
  automation,
}: AutomationFlyoutProps): React.ReactElement {
  const isEditMode = automation != null;

  const initialTriggers = isEditMode
    ? triggerRowsToEntries(automation.trigger?.rows ?? [])
    : [];

  const [name, setName] = useState(isEditMode ? automation.name : '');
  const [agentInstructions, setAgentInstructions] = useState(
    isEditMode ? (automation.execution?.promptTemplate ?? '') : ''
  );
  const [triggers, setTriggers] = useState<TriggerEntry[]>(initialTriggers);
  const [dailyLimit, setDailyLimit] = useState(
    isEditMode ? (automation.runtime?.dailyDispatchLimit ?? 20) : 20
  );
  const [submitted, setSubmitted] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const { mutateAsync: createAutomation, isLoading: isCreating } = useCreateAutomation();
  const { mutateAsync: updateAutomation, isLoading: isUpdating } = useUpdateAutomation();
  const isLoading = isCreating || isUpdating;

  const nameIsValid = name.trim().length > 0;

  const updateTrigger = (id: string, patch: Partial<TriggerEntry>) =>
    setTriggers((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));

  const removeTrigger = (id: string) =>
    setTriggers((prev) => prev.filter((t) => t.id !== id));

  const addTrigger = (kind: TriggerKind) =>
    setTriggers((prev) => [...prev, makeTrigger(kind)]);

  const buildTriggerRows = () =>
    triggers.map((t) => {
      if (t.kind === 'significant_event') {
        return {
          kind: 'significant_event' as const,
          ...(t.severities.length > 0 && { severities: t.severities }),
        };
      }
      return {
        kind: 'alert' as const,
        ...(t.ruleNamePattern.trim() && { ruleNamePattern: t.ruleNamePattern.trim() }),
        ...(t.alertStatus !== 'any' && { alertStatus: t.alertStatus }),
        ...(t.tags.length > 0 && { tags: t.tags }),
      };
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setSaveError(null);
    if (!nameIsValid) return;

    try {
      if (isEditMode) {
        await updateAutomation({
          id: automation.id,
          updates: {
            name: name.trim(),
            trigger: { rows: buildTriggerRows() },
            execution: {
              ...(agentInstructions.trim() && { promptTemplate: agentInstructions.trim() }),
            },
            // Preserve existing runtime settings; only override dailyDispatchLimit
            runtime: {
              ...automation.runtime,
              dailyDispatchLimit: dailyLimit,
            },
            // Do not send completion — shallow-merge update would wipe existing config
          },
        });
      } else {
        await createAutomation({
          name: name.trim(),
          trigger: { rows: buildTriggerRows() },
          execution: {
            ...(agentInstructions.trim() && { promptTemplate: agentInstructions.trim() }),
          },
          completion: {},
          runtime: { dailyDispatchLimit: dailyLimit },
        });
      }
      onSaved?.();
      onClose();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : String(err));
    }
  };

  const formId = isEditMode ? 'editAutomationForm' : 'createAutomationForm';
  const flyoutTitle = isEditMode
    ? i18n.translate('xpack.nightshift.automations.flyout.editTitle', {
        defaultMessage: 'Edit automation',
      })
    : i18n.translate('xpack.nightshift.automations.createFlyout.title', {
        defaultMessage: 'Create automation',
      });
  const submitLabel = isEditMode
    ? i18n.translate('xpack.nightshift.automations.flyout.saveButton', {
        defaultMessage: 'Save',
      })
    : i18n.translate('xpack.nightshift.automations.createFlyout.createButton', {
        defaultMessage: 'Create',
      });
  const errorTitle = isEditMode
    ? i18n.translate('xpack.nightshift.automations.flyout.editErrorTitle', {
        defaultMessage: 'Failed to save automation',
      })
    : i18n.translate('xpack.nightshift.automations.createFlyout.errorTitle', {
        defaultMessage: 'Failed to create automation',
      });

  const hasScheduleTrigger =
    isEditMode &&
    (automation.trigger?.rows ?? []).some((r) => r.kind === 'schedule');

  return (
    <EuiFlyout ownFocus size="m" onClose={onClose} data-test-subj="nightshiftAutomationFlyout">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>{flyoutTitle}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        {saveError != null && (
          <>
            <EuiCallOut color="danger" iconType="error" title={errorTitle}>
              <p>{saveError}</p>
            </EuiCallOut>
            <EuiSpacer />
          </>
        )}

        {hasScheduleTrigger && (
          <>
            <EuiCallOut
              color="warning"
              iconType="warning"
              title={i18n.translate('xpack.nightshift.automations.flyout.scheduleWarningTitle', {
                defaultMessage: 'Schedule trigger is read-only',
              })}
            >
              <p>
                {i18n.translate('xpack.nightshift.automations.flyout.scheduleWarningBody', {
                  defaultMessage:
                    'This automation has a schedule trigger that cannot be edited here. Other settings can still be updated.',
                })}
              </p>
            </EuiCallOut>
            <EuiSpacer />
          </>
        )}

        <EuiForm component="form" onSubmit={handleSubmit} id={formId}>
          <EuiFormRow
            label={i18n.translate('xpack.nightshift.automations.createFlyout.nameLabel', {
              defaultMessage: 'Name',
            })}
            isInvalid={submitted && !nameIsValid}
            error={i18n.translate('xpack.nightshift.automations.createFlyout.nameRequired', {
              defaultMessage: 'Name is required',
            })}
            fullWidth
          >
            <EuiFieldText
              value={name}
              onChange={(e) => setName(e.target.value)}
              isInvalid={submitted && !nameIsValid}
              fullWidth
              data-test-subj="nightshiftAutomationName"
            />
          </EuiFormRow>

          <EuiSpacer size="m" />

          <EuiFormLabel>
            {i18n.translate('xpack.nightshift.automations.createFlyout.triggersLabel', {
              defaultMessage: 'Triggers',
            })}
          </EuiFormLabel>
          <EuiSpacer size="xs" />

          <EuiPanel hasBorder hasShadow={false} paddingSize="none">
            {triggers.map((trigger, index) => (
              <React.Fragment key={trigger.id}>
                {index > 0 && <EuiHorizontalRule margin="none" />}
                <TriggerRow
                  trigger={trigger}
                  onChange={(patch) => updateTrigger(trigger.id, patch)}
                  onRemove={() => removeTrigger(trigger.id)}
                />
              </React.Fragment>
            ))}
            {triggers.length > 0 && <EuiHorizontalRule margin="none" />}
            <TriggerTypePicker onSelect={addTrigger} />
          </EuiPanel>

          <EuiSpacer size="m" />

          <EuiFormRow
            label={i18n.translate('xpack.nightshift.automations.createFlyout.dailyLimitLabel', {
              defaultMessage: 'Daily run limit',
            })}
            helpText={i18n.translate('xpack.nightshift.automations.createFlyout.dailyLimitHelp', {
              defaultMessage: 'Maximum investigations triggered per day. 0 = unlimited.',
            })}
            fullWidth
          >
            <EuiFieldNumber
              value={dailyLimit}
              onChange={(e) => setDailyLimit(parseInt(e.target.value, 10) || 0)}
              min={0}
              fullWidth
              data-test-subj="nightshiftAutomationDailyLimit"
            />
          </EuiFormRow>

          <EuiFormRow
            label={i18n.translate(
              'xpack.nightshift.automations.createFlyout.agentInstructionsLabel',
              { defaultMessage: 'Agent instructions' }
            )}
            labelAppend={i18n.translate(
              'xpack.nightshift.automations.createFlyout.optionalLabel',
              { defaultMessage: 'Optional' }
            )}
            helpText={i18n.translate(
              'xpack.nightshift.automations.createFlyout.agentInstructionsHelp',
              { defaultMessage: 'Custom prompt sent to the agent when this automation triggers.' }
            )}
            fullWidth
          >
            <EuiTextArea
              value={agentInstructions}
              onChange={(e) => setAgentInstructions(e.target.value)}
              rows={3}
              fullWidth
              data-test-subj="nightshiftAutomationAgentInstructions"
            />
          </EuiFormRow>
        </EuiForm>
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiButtonEmpty onClick={onClose} isDisabled={isLoading}>
          {i18n.translate('xpack.nightshift.automations.createFlyout.cancelButton', {
            defaultMessage: 'Cancel',
          })}
        </EuiButtonEmpty>
        <EuiButton
          fill
          type="submit"
          form={formId}
          isLoading={isLoading}
          data-test-subj="nightshiftAutomationSubmit"
        >
          {submitLabel}
        </EuiButton>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
}

/** Backward-compat alias — existing callers that import CreateAutomationFlyout continue to work. */
export const CreateAutomationFlyout = ({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated?: () => void;
}): React.ReactElement => <AutomationFlyout onClose={onClose} onSaved={onCreated} />;
