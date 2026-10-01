/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiConfirmModal,
  EuiContextMenuItem,
  EuiComboBox,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiFlyoutResizable,
  EuiFormRow,
  EuiPopover,
  EuiSpacer,
  EuiSwitch,
  EuiTab,
  EuiTabs,
  EuiText,
  EuiTextArea,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useCreateAutomation, type Automation } from '../hooks/use_automations';
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
  automationName: i18n.translate('xpack.nightshift.automations.flyout.automationName', {
    defaultMessage: 'Automation name',
  }),
  addTags: i18n.translate('xpack.nightshift.automations.flyout.addTags', {
    defaultMessage: 'Add tags',
  }),
  addTag: i18n.translate('xpack.nightshift.automations.flyout.addTag', {
    defaultMessage: 'Add tag',
  }),
  addTagOption: i18n.translate('xpack.nightshift.automations.flyout.addTagOption', {
    defaultMessage: 'Add {searchValue} as a tag',
    values: { searchValue: '{searchValue}' },
  }),
  clickToRename: i18n.translate('xpack.nightshift.automations.flyout.clickToRename', {
    defaultMessage: 'Click to rename',
  }),
  tagPlaceholder: i18n.translate('xpack.nightshift.automations.flyout.tagPlaceholder', {
    defaultMessage: 'Type a tag and press Enter',
  }),
  settings: i18n.translate('xpack.nightshift.automations.flyout.settingsTab', {
    defaultMessage: 'Settings',
  }),
  runHistory: i18n.translate('xpack.nightshift.automations.flyout.runHistoryTab', {
    defaultMessage: 'Run history',
  }),
  runHistoryDisabled: i18n.translate('xpack.nightshift.automations.flyout.runHistoryDisabled', {
    defaultMessage: 'Save the automation to see run history',
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
  rename: i18n.translate('xpack.nightshift.automations.flyout.rename', {
    defaultMessage: 'Rename',
  }),
  discardDraft: i18n.translate('xpack.nightshift.automations.flyout.discardDraft', {
    defaultMessage: 'Discard draft',
  }),
  active: i18n.translate('xpack.nightshift.automations.flyout.active', {
    defaultMessage: 'Active',
  }),
  paused: i18n.translate('xpack.nightshift.automations.flyout.paused', {
    defaultMessage: 'Paused',
  }),
  savesAsPaused: i18n.translate('xpack.nightshift.automations.flyout.savesAsPaused', {
    defaultMessage: 'Saves as paused',
  }),
  activatesWhenSaved: i18n.translate('xpack.nightshift.automations.flyout.activatesWhenSaved', {
    defaultMessage: 'Activates when saved',
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

const AutomationTagsEditor = ({
  tags,
  suggestions,
  onChange,
}: {
  tags: string[];
  suggestions: string[];
  onChange: (tags: string[]) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const addTag = (tag: string) => {
    const trimmed = tag.trim().slice(0, MAX_TAG_LENGTH);
    if (trimmed && !tags.some((existing) => existing.toLowerCase() === trimmed.toLowerCase())) {
      onChange([...tags, trimmed]);
    }
  };
  const options = suggestions
    .filter((suggestion) => !tags.some((tag) => tag.toLowerCase() === suggestion.toLowerCase()))
    .map((label) => ({ label }));

  return (
    <EuiFlexGroup alignItems="center" gutterSize="xs" wrap responsive={false}>
      {tags.map((tag) => (
        <EuiFlexItem grow={false} key={tag}>
          <EuiBadge
            color="hollow"
            iconType="cross"
            iconSide="right"
            iconOnClick={() => onChange(tags.filter((existing) => existing !== tag))}
            iconOnClickAriaLabel={i18n.translate('xpack.nightshift.automations.flyout.removeTag', {
              defaultMessage: 'Remove tag {tag}',
              values: { tag },
            })}
          >
            {tag}
          </EuiBadge>
        </EuiFlexItem>
      ))}
      <EuiFlexItem grow={false}>
        <EuiPopover
          aria-label={labels.addTags}
          isOpen={isOpen}
          closePopover={() => setIsOpen(false)}
          panelPaddingSize="s"
          anchorPosition="downLeft"
          button={
            <EuiButtonEmpty
              size="xs"
              color="text"
              iconType="tag"
              flush={tags.length ? undefined : 'left'}
              onClick={() => setIsOpen((open) => !open)}
              data-test-subj="automationAddTags"
            >
              {tags.length ? labels.addTag : labels.addTags}
            </EuiButtonEmpty>
          }
        >
          <div css={{ width: 260 }}>
            <EuiComboBox
              compressed
              fullWidth
              autoFocus
              aria-label={labels.addTag}
              placeholder={labels.tagPlaceholder}
              customOptionText={labels.addTagOption}
              options={options}
              selectedOptions={[]}
              onCreateOption={addTag}
              onChange={([selected]) => selected && addTag(selected.label)}
              inputRef={(input) => input?.setAttribute('maxLength', String(MAX_TAG_LENGTH))}
              data-test-subj="automationTagInput"
            />
          </div>
        </EuiPopover>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const AutomationNameTitle = ({
  name,
  isEditing,
  isInvalid,
  onEdit,
  onCommit,
}: {
  name: string;
  isEditing: boolean;
  isInvalid: boolean;
  onEdit: () => void;
  onCommit: (name: string) => void;
}) => {
  const { euiTheme } = useEuiTheme();
  const [value, setValue] = useState(name);
  const startEditing = () => {
    setValue(name);
    onEdit();
  };
  const box = css`
    margin: -${euiTheme.size.xs} 0 -${euiTheme.size.xs} -${euiTheme.size.s};
    padding: ${euiTheme.size.xs} ${euiTheme.size.s};
    border-radius: ${euiTheme.border.radius.small};
  `;

  if (isEditing) {
    return (
      <EuiTitle size="s">
        <h2>
          <input
            autoFocus
            aria-label={labels.automationName}
            aria-invalid={isInvalid}
            placeholder={labels.untitled}
            value={value}
            onFocus={(event) => event.target.select()}
            onChange={(event) => setValue(event.target.value)}
            onBlur={() => onCommit(value.trim() || name)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') onCommit(value.trim() || name);
              if (event.key === 'Escape') {
                event.stopPropagation();
                setValue(name);
                onCommit(name);
              }
            }}
            css={[
              box,
              css`
                display: block;
                font: inherit;
                letter-spacing: inherit;
                color: inherit;
                border: none;
                outline: ${euiTheme.border.width.thick} solid
                  ${isInvalid ? euiTheme.colors.danger : euiTheme.colors.primary};
                background: ${euiTheme.colors.backgroundBasePlain};
                inline-size: calc(
                  ${Math.max(value.length, labels.untitled.length)}ch + ${euiTheme.size.l}
                );
                max-inline-size: 100%;
                &::placeholder {
                  color: ${euiTheme.colors.textSubdued};
                }
              `,
            ]}
            data-test-subj="automationName"
          />
        </h2>
      </EuiTitle>
    );
  }

  return (
    <EuiToolTip content={labels.clickToRename} position="bottom">
      <EuiTitle size="s">
        <h2>
          <span
            role="button"
            tabIndex={0}
            onClick={startEditing}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                startEditing();
              }
            }}
            css={[
              box,
              css`
                display: inline-block;
                cursor: text;
                color: ${name ? 'inherit' : euiTheme.colors.textSubdued};
                &:hover {
                  background-color: ${euiTheme.colors.backgroundBaseInteractiveHover};
                }
              `,
            ]}
            data-test-subj="automationNameReadMode"
          >
            {name || labels.untitled}
          </span>
        </h2>
      </EuiTitle>
    </EuiToolTip>
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
  automation,
  tagSuggestions = [],
}: {
  onClose: () => void;
  automation?: Automation;
  tagSuggestions?: string[];
}): React.ReactElement => {
  const [initialDraft] = useState(() => createAutomationDraft(automation));
  const [draft, setDraft] = useState(initialDraft);
  const [isEditingName, setIsEditingName] = useState(false);
  const [isNameInvalid, setIsNameInvalid] = useState(false);
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const [isDiscardOpen, setIsDiscardOpen] = useState(false);
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
  const openTitleEdit = () => setIsEditingName(true);

  const save = () => {
    const { trigger } = draft;
    if (!isTriggerValid(trigger)) return;
    if (!draft.name.trim()) {
      setIsNameInvalid(true);
      openTitleEdit();
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
      aria-label={draft.name || labels.untitled}
    >
      <EuiFlyoutHeader css={{ borderBlockEnd: euiTheme.border.thin }}>
        <AutomationNameTitle
          name={draft.name}
          isEditing={isEditingName}
          isInvalid={isNameInvalid}
          onEdit={openTitleEdit}
          onCommit={(name) => {
            update({ name });
            setIsEditingName(false);
            setIsNameInvalid(false);
          }}
        />
        <EuiSpacer size="xs" />
        <AutomationTagsEditor
          tags={draft.tags}
          suggestions={tagSuggestions}
          onChange={(tags) => update({ tags })}
        />
        <EuiSpacer size="m" />
        <EuiTabs bottomBorder={false}>
          <EuiTab isSelected>{labels.settings}</EuiTab>
          <EuiToolTip content={labels.runHistoryDisabled}>
            <EuiTab disabled>{labels.runHistory}</EuiTab>
          </EuiToolTip>
        </EuiTabs>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
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
        <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiPopover
              aria-label={actionLabels.actions}
              isOpen={isActionsOpen}
              closePopover={() => setIsActionsOpen(false)}
              panelPaddingSize="none"
              anchorPosition="upLeft"
              button={
                <EuiButtonEmpty
                  color="text"
                  iconType="chevronSingleDown"
                  iconSide="right"
                  onClick={() => setIsActionsOpen((open) => !open)}
                  data-test-subj="automationFlyoutActions"
                >
                  {actionLabels.actions}
                </EuiButtonEmpty>
              }
            >
              <EuiContextMenuPanel
                items={[
                  <EuiContextMenuItem
                    key="rename"
                    icon="pencil"
                    onClick={() => {
                      setIsActionsOpen(false);
                      openTitleEdit();
                    }}
                  >
                    {labels.rename}
                  </EuiContextMenuItem>,
                  <EuiContextMenuItem
                    key="discard"
                    icon="trash"
                    color="danger"
                    onClick={() => {
                      setIsActionsOpen(false);
                      requestClose();
                    }}
                  >
                    {labels.discardDraft}
                  </EuiContextMenuItem>,
                ]}
              />
            </EuiPopover>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiSwitch
                  compressed
                  label={draft.isEnabled ? labels.active : labels.paused}
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
                  {draft.isEnabled ? labels.activatesWhenSaved : labels.savesAsPaused}
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
