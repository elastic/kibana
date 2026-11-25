/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSpacer,
  EuiText,
  EuiTextArea,
} from '@elastic/eui';
import type { RuleSet, RuleSetDefinition } from '../../../../common/api/detection_engine/rule_sets';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import { useRulesTableContextOptional } from '../../rule_management_ui/components/rules_table/rules_table/rules_table_context';
import { useSaveRuleSetMutation } from '../api';
import { ruleSetFilterState } from '../table_query';
import * as i18n from './translations';

export type RuleSetText = Pick<RuleSetDefinition, 'name' | 'description' | 'visibility'>;

/**
 * Name, optional description and who can see the set: all a set needs besides its rules, which
 * come from the facets and the table.
 */
export const RuleSetNameForm = ({
  initial,
  hint,
  submitLabel = i18n.SAVE,
  withDescription = false,
  canChangeVisibility = true,
  isSaving,
  onSubmit,
  onCancel,
}: {
  initial?: Partial<RuleSetText>;
  hint?: string;
  submitLabel?: string;
  withDescription?: boolean;
  canChangeVisibility?: boolean;
  isSaving: boolean;
  onSubmit: (text: RuleSetText) => void;
  onCancel: () => void;
}) => {
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [visibility, setVisibility] = useState<RuleSetText['visibility']>(
    initial?.visibility ?? 'space'
  );
  const submit = () =>
    name.trim() &&
    onSubmit({
      name: name.trim(),
      visibility,
      ...(description.trim() ? { description: description.trim() } : {}),
    });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      data-test-subj="ruleSetNameForm"
    >
      <EuiFormRow label={i18n.NAME} fullWidth>
        <EuiFieldText
          fullWidth
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          data-test-subj="ruleSetNameField"
        />
      </EuiFormRow>
      {withDescription && (
        <EuiFormRow
          label={i18n.DESCRIPTION}
          fullWidth
          labelAppend={
            <EuiText size="xs" color="subdued">
              {i18n.OPTIONAL}
            </EuiText>
          }
        >
          <EuiTextArea
            fullWidth
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </EuiFormRow>
      )}
      <EuiFormRow label={i18n.VISIBILITY} fullWidth>
        <EuiButtonGroup
          legend={i18n.VISIBILITY}
          isFullWidth
          buttonSize="compressed"
          idSelected={visibility}
          isDisabled={!canChangeVisibility}
          onChange={(id) => setVisibility(id === 'private' ? 'private' : 'space')}
          options={[
            { id: 'space', label: i18n.VISIBILITY_SPACE },
            { id: 'private', label: i18n.VISIBILITY_PRIVATE },
          ]}
        />
      </EuiFormRow>
      {hint && (
        <>
          <EuiSpacer size="s" />
          <EuiText size="xs" color="subdued">
            <p>{hint}</p>
          </EuiText>
        </>
      )}
      <EuiSpacer size="m" />
      <EuiFlexGroup justifyContent="flexEnd" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty size="s" onClick={onCancel}>
            {i18n.CANCEL}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            size="s"
            fill
            type="submit"
            isLoading={isSaving}
            isDisabled={!name.trim()}
            data-test-subj="ruleSetNameSave"
          >
            {submitLabel}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </form>
  );
};

/** Creates a set and shows it in the rules table. */
export const useCreateRuleSet = () => {
  const { mutateAsync: save, isLoading } = useSaveRuleSetMutation();
  const { addSuccess, addError } = useAppToasts();
  const rulesTable = useRulesTableContextOptional();

  const create = async (
    text: RuleSetText,
    rules: Pick<RuleSetDefinition, 'conditions' | 'included_rule_ids' | 'excluded_rule_ids'>
  ): Promise<RuleSet | undefined> => {
    try {
      const saved = await save({ ...text, ...rules });
      addSuccess(i18n.SAVED_TOAST(saved.name));
      rulesTable?.actions.setFilterOptions({ ruleSetId: saved.id, ...ruleSetFilterState(saved) });
      return saved;
    } catch (error) {
      addError(error, { title: i18n.SAVE_ERROR });
      return undefined;
    }
  };
  return { create, isLoading };
};
