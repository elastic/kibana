/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiConfirmModal,
  EuiComboBox,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiFlyoutResizable,
  EuiFormRow,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTextArea,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useCreateAutomation } from '../hooks/use_automations';
import {
  createAutomationDraft,
  hasDailyLimit,
  isTriggerValid,
  isValidCron,
  isValidDailyLimit,
  toCreateAutomationBody,
  type AutomationDraft,
} from './automation_draft';
import { AutomationActionsSection, actionLabels } from './automation_actions_section';
import { AutomationInstructions } from './automation_instructions';
import { AutomationTriggerSection } from './automation_trigger_section';

const MAX_TAG_LENGTH = 32;

const labels = {
  untitled: i18n.translate('xpack.nightshift.automations.flyout.untitled', {
    defaultMessage: 'Untitled automation',
  }),
  createTitle: i18n.translate('xpack.nightshift.automations.flyout.createTitle', {
    defaultMessage: 'Create automation',
  }),
  name: i18n.translate('xpack.nightshift.automations.flyout.nameLabel', {
    defaultMessage: 'Name',
  }),
  namePlaceholder: i18n.translate('xpack.nightshift.automations.flyout.namePlaceholder', {
    defaultMessage: 'Name this automation',
  }),
  tags: i18n.translate('xpack.nightshift.automations.flyout.tagsLabel', {
    defaultMessage: 'Tags',
  }),
  addTags: i18n.translate('xpack.nightshift.automations.flyout.addTags', {
    defaultMessage: 'Add tags',
  }),
  addTagOption: i18n.translate('xpack.nightshift.automations.flyout.addTagOption', {
    defaultMessage: 'Add {searchValue} as a tag',
    values: { searchValue: '{searchValue}' },
  }),
  description: i18n.translate('xpack.nightshift.automations.descriptionLabel', {
    defaultMessage: 'Description',
  }),
  optional: i18n.translate('xpack.nightshift.automations.flyout.optional', {
    defaultMessage: 'Optional',
  }),
  descriptionPlaceholder: i18n.translate('xpack.nightshift.automations.descriptionPlaceholder', {
    defaultMessage: 'What does this automation do?',
  }),
  enabled: i18n.translate('xpack.nightshift.automations.flyout.enabled', {
    defaultMessage: 'Enabled',
  }),
  disabled: i18n.translate('xpack.nightshift.automations.flyout.disabled', {
    defaultMessage: 'Disabled',
  }),
  savesAsDisabled: i18n.translate('xpack.nightshift.automations.flyout.savesAsDisabled', {
    defaultMessage: 'Saves as disabled',
  }),
  enablesWhenSaved: i18n.translate('xpack.nightshift.automations.flyout.enablesWhenSaved', {
    defaultMessage: 'Enables when saved',
  }),
  save: i18n.translate('xpack.nightshift.automations.flyout.save', { defaultMessage: 'Save' }),
  cronError: i18n.translate('xpack.nightshift.automations.flyout.cronError', {
    defaultMessage: 'Fix the cron expression to save',
  }),
  discardTitle: i18n.translate('xpack.nightshift.automations.flyout.discardTitle', {
    defaultMessage: 'Discard this automation?',
  }),
  keepEditing: i18n.translate('xpack.nightshift.automations.flyout.keepEditing', {
    defaultMessage: 'Keep editing',
  }),
  discard: i18n.translate('xpack.nightshift.automations.flyout.discard', {
    defaultMessage: 'Discard',
  }),
};

const getDiscardBody = (name: string) =>
  i18n.translate('xpack.nightshift.automations.flyout.discardBody', {
    defaultMessage: '{name} has not been saved. If you leave now, this draft will be discarded.',
    values: { name },
  });

const AutomationTagsField = ({
  tags,
  suggestions,
  onChange,
}: {
  tags: string[];
  suggestions: string[];
  onChange: (tags: string[]) => void;
}) => {
  const addTag = (tag: string) => {
    const trimmed = tag.trim().slice(0, MAX_TAG_LENGTH);
    if (trimmed && !tags.some((existing) => existing.toLowerCase() === trimmed.toLowerCase())) {
      onChange([...tags, trimmed]);
    }
  };

  return (
    <EuiComboBox
      fullWidth
      compressed
      aria-label={labels.tags}
      placeholder={labels.addTags}
      customOptionText={labels.addTagOption}
      options={suggestions.map((label) => ({ label }))}
      selectedOptions={tags.map((label) => ({ label }))}
      onCreateOption={addTag}
      onChange={(selected) => onChange(selected.map(({ label }) => label))}
      inputRef={(input) => input?.setAttribute('maxLength', String(MAX_TAG_LENGTH))}
      data-test-subj="automationTagInput"
    />
  );
};

const getSaveBlocker = (draft: AutomationDraft): string | undefined => {
  if (draft.trigger?.kind === 'cron' && !isValidCron(draft.trigger.cronExpression)) {
    return labels.cronError;
  }
  if (draft.slackAction && !draft.slackAction.destination.trim()) {
    return draft.slackAction.target === 'channel'
      ? actionLabels.channelRequired
      : actionLabels.personRequired;
  }
  return undefined;
};

export const CreateAutomationFlyout = ({
  onClose,
  tagSuggestions = [],
}: {
  onClose: () => void;
  tagSuggestions?: string[];
}): React.ReactElement => {
  const [initialDraft] = useState(createAutomationDraft);
  const [draft, setDraft] = useState(initialDraft);
  const [isNameInvalid, setIsNameInvalid] = useState(false);
  const [isDiscardOpen, setIsDiscardOpen] = useState(false);
  const titleId = useGeneratedHtmlId();
  const createAutomation = useCreateAutomation();
  const { euiTheme } = useEuiTheme();
  const update = (changes: Partial<AutomationDraft>) =>
    setDraft((current) => ({ ...current, ...changes }));
  const isDirty = JSON.stringify(draft) !== JSON.stringify(initialDraft);
  const saveBlocker = getSaveBlocker(draft);
  const canSave =
    isTriggerValid(draft.trigger) &&
    (!hasDailyLimit(draft.trigger) || isValidDailyLimit(draft.dailyDispatchLimit)) &&
    !saveBlocker;

  const requestClose = () => (isDirty ? setIsDiscardOpen(true) : onClose());

  const save = () => {
    const { trigger } = draft;
    if (!isTriggerValid(trigger)) return;
    if (!draft.name.trim()) {
      setIsNameInvalid(true);
      return;
    }
    createAutomation.mutate(toCreateAutomationBody({ ...draft, trigger }), { onSuccess: onClose });
  };

  const saveButton = (
    <EuiButton
      fill
      size="s"
      isDisabled={!canSave}
      isLoading={createAutomation.isLoading}
      onClick={save}
      data-test-subj="submitAutomation"
    >
      {labels.save}
    </EuiButton>
  );

  return (
    <EuiFlyoutResizable
      onClose={requestClose}
      size={780}
      minWidth={420}
      maxWidth={960}
      aria-labelledby={titleId}
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2 id={titleId}>{labels.createTitle}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiFormRow fullWidth label={labels.name} isInvalid={isNameInvalid}>
          <EuiFieldText
            fullWidth
            compressed
            placeholder={labels.namePlaceholder}
            value={draft.name}
            isInvalid={isNameInvalid}
            onChange={(event) => {
              update({ name: event.target.value });
              setIsNameInvalid(false);
            }}
            data-test-subj="automationName"
          />
        </EuiFormRow>
        <EuiFormRow
          fullWidth
          label={labels.tags}
          labelAppend={
            <EuiText size="xs" color="subdued">
              {labels.optional}
            </EuiText>
          }
        >
          <AutomationTagsField
            tags={draft.tags}
            suggestions={tagSuggestions}
            onChange={(tags) => update({ tags })}
          />
        </EuiFormRow>
        <EuiFormRow
          fullWidth
          label={labels.description}
          labelAppend={
            <EuiText size="xs" color="subdued">
              {labels.optional}
            </EuiText>
          }
        >
          <EuiTextArea
            fullWidth
            compressed
            rows={1}
            resize="none"
            css={{ fieldSizing: 'content', minBlockSize: 0, maxBlockSize: 160 }}
            maxLength={200}
            placeholder={labels.descriptionPlaceholder}
            value={draft.description}
            onChange={(event) => update({ description: event.target.value })}
            data-test-subj="automationDescription"
          />
        </EuiFormRow>
        <EuiSpacer size="l" />
        <AutomationTriggerSection
          trigger={draft.trigger}
          dailyDispatchLimit={draft.dailyDispatchLimit}
          onTriggerChange={(trigger) => update({ trigger })}
          onDailyDispatchLimitChange={(dailyDispatchLimit) => update({ dailyDispatchLimit })}
        />
        <EuiSpacer size="l" />
        <AutomationInstructions
          instructions={draft.instructions}
          mode={draft.mode}
          onInstructionsChange={(instructions) => update({ instructions })}
          onModeChange={(mode) => update({ mode })}
        />
        <EuiSpacer size="l" />
        <AutomationActionsSection
          slackAction={draft.slackAction}
          onSlackActionChange={(slackAction) => update({ slackAction })}
        />
      </EuiFlyoutBody>
      <footer
        css={{
          flexShrink: 0,
          padding: euiTheme.size.m,
          backgroundColor: euiTheme.colors.backgroundBasePlain,
          borderBlockStart: euiTheme.border.thin,
        }}
      >
        <EuiFlexGroup alignItems="center" justifyContent="flexEnd" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiSwitch
                  compressed
                  label={draft.isEnabled ? labels.enabled : labels.disabled}
                  checked={draft.isEnabled}
                  onChange={(event) => update({ isEnabled: event.target.checked })}
                  data-test-subj="automationEnabledSwitch"
                />
              </EuiFlexItem>
              <EuiFlexItem
                grow={false}
                css={{
                  paddingInlineEnd: euiTheme.size.m,
                  borderInlineEnd: euiTheme.border.thin,
                }}
              >
                <EuiText size="xs" color="subdued">
                  {draft.isEnabled ? labels.enablesWhenSaved : labels.savesAsDisabled}
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                {saveBlocker ? (
                  <EuiToolTip content={saveBlocker}>{saveButton}</EuiToolTip>
                ) : (
                  saveButton
                )}
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </footer>
      {isDiscardOpen && (
        <EuiConfirmModal
          aria-label={labels.discardTitle}
          title={labels.discardTitle}
          onCancel={() => setIsDiscardOpen(false)}
          onConfirm={onClose}
          cancelButtonText={labels.keepEditing}
          confirmButtonText={labels.discard}
          buttonColor="danger"
          data-test-subj="automationDiscardModal"
        >
          <p>{getDiscardBody(draft.name || labels.untitled)}</p>
        </EuiConfirmModal>
      )}
    </EuiFlyoutResizable>
  );
};
