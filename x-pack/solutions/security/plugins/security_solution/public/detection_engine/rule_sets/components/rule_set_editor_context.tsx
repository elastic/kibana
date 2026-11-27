/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useMemo, useState } from 'react';
import {
  EuiModal,
  EuiModalBody,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSkeletonText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { RuleSetDefinition } from '../../../../common/api/detection_engine/rule_sets';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import { useRuleSetQuery, useSaveRuleSetMutation } from '../api';
import { RuleSetsSelectable } from './rule_sets_selectable';
import { RuleSetNameForm, useCreateRuleSet } from './rule_set_name_form';
import * as i18n from './translations';

type RuleSetRules = Pick<
  RuleSetDefinition,
  'conditions' | 'included_rule_ids' | 'excluded_rule_ids'
>;

export interface SaveDialogParams {
  rules: RuleSetRules;
  name?: string;
  /** What the set will hold, under the form. */
  hint?: string;
}

interface RuleSetDialogsValue {
  /** Asks for a name and saves a new set with these rules. */
  openSaveDialog: (params: SaveDialogParams) => void;
  /** Name, description and who can see a saved set. */
  openSettings: (ruleSetId: string) => void;
  /** The "Rule sets" checkbox list for one rule, from the row menu of the rules table. */
  openGroupsMenu: (rule: { id: string; rule_id: string; name: string }) => void;
}

const RuleSetEditorContext = createContext<RuleSetDialogsValue | null>(null);

const SaveDialog = ({ params, onClose }: { params: SaveDialogParams; onClose: () => void }) => {
  const titleId = useGeneratedHtmlId();
  const { create, isLoading } = useCreateRuleSet();
  return (
    <EuiModal aria-labelledby={titleId} onClose={onClose} css={{ width: 420 }}>
      <EuiModalHeader>
        <EuiModalHeaderTitle size="xs" id={titleId}>
          {i18n.SAVE_AS_RULE_SET_TITLE}
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <RuleSetNameForm
          initial={{ name: params.name }}
          hint={params.hint}
          isSaving={isLoading}
          onCancel={onClose}
          onSubmit={async (text) => {
            if (await create(text, params.rules)) onClose();
          }}
        />
      </EuiModalBody>
    </EuiModal>
  );
};

const SettingsDialog = ({ ruleSetId, onClose }: { ruleSetId: string; onClose: () => void }) => {
  const titleId = useGeneratedHtmlId();
  const { data: set } = useRuleSetQuery(ruleSetId);
  const { mutateAsync: save, isLoading } = useSaveRuleSetMutation();
  const { addSuccess, addError } = useAppToasts();
  return (
    <EuiModal aria-labelledby={titleId} onClose={onClose} css={{ width: 460 }}>
      <EuiModalHeader>
        <EuiModalHeaderTitle size="xs" id={titleId}>
          {i18n.SETTINGS}
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        {!set ? (
          <EuiSkeletonText lines={4} />
        ) : (
          <RuleSetNameForm
            initial={set}
            withDescription
            canChangeVisibility={set.is_owner}
            isSaving={isLoading}
            onCancel={onClose}
            onSubmit={async (text) => {
              try {
                const { id, version, conditions, included_rule_ids, excluded_rule_ids } = set;
                await save({
                  id,
                  version,
                  conditions,
                  included_rule_ids,
                  excluded_rule_ids,
                  ...text,
                });
                addSuccess(i18n.SAVED_TOAST(text.name));
                onClose();
              } catch (error) {
                addError(error, { title: i18n.SAVE_ERROR });
              }
            }}
          />
        )}
      </EuiModalBody>
    </EuiModal>
  );
};

/** The small dialogs of rule sets. The rules of a set are edited on the rules page itself. */
export const RuleSetEditorProvider = ({ children }: { children: React.ReactNode }) => {
  const [saveParams, setSaveParams] = useState<SaveDialogParams | null>(null);
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const menuTitleId = useGeneratedHtmlId();
  const [menuRule, setMenuRule] = useState<{ id: string; rule_id: string; name: string } | null>(
    null
  );
  const value = useMemo(
    () => ({
      openSaveDialog: setSaveParams,
      openSettings: setSettingsId,
      openGroupsMenu: setMenuRule,
    }),
    []
  );

  return (
    <RuleSetEditorContext.Provider value={value}>
      {children}
      {saveParams && <SaveDialog params={saveParams} onClose={() => setSaveParams(null)} />}
      {settingsId && <SettingsDialog ruleSetId={settingsId} onClose={() => setSettingsId(null)} />}
      {menuRule && (
        <EuiModal
          aria-labelledby={menuTitleId}
          onClose={() => setMenuRule(null)}
          css={{ width: 360 }}
        >
          <EuiModalHeader>
            <EuiModalHeaderTitle size="xs" id={menuTitleId}>
              {menuRule.name}
            </EuiModalHeaderTitle>
          </EuiModalHeader>
          <EuiModalBody>
            <RuleSetsSelectable
              ruleIds={[menuRule.id]}
              ruleRuleIds={[menuRule.rule_id]}
              onDone={() => setMenuRule(null)}
              onNewGroup={(picked) => {
                setMenuRule(null);
                setSaveParams({
                  rules: { conditions: {}, included_rule_ids: picked, excluded_rule_ids: [] },
                  name: menuRule.name,
                  hint: i18n.HINT_PICKED(picked.length),
                });
              }}
            />
          </EuiModalBody>
        </EuiModal>
      )}
    </RuleSetEditorContext.Provider>
  );
};

export const useRuleSetEditorOptional = (): RuleSetDialogsValue | null =>
  useContext(RuleSetEditorContext);

export const useRuleSetEditor = (): RuleSetDialogsValue => {
  const value = useContext(RuleSetEditorContext);
  if (!value) {
    throw new Error('useRuleSetEditor must be used inside RuleSetEditorProvider');
  }
  return value;
};
