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
  useGeneratedHtmlId,
} from '@elastic/eui';
import type {
  RuleGroup,
  RuleGroupDefinition,
} from '../../../../common/api/detection_engine/rule_groups';
import { useRulesTableContextOptional } from '../../rule_management_ui/components/rules_table/rules_table/rules_table_context';
import { RuleGroupEditorFlyout } from './rule_group_editor_flyout';
import { RuleGroupsSelectable } from './rule_groups_selectable';

export interface OpenEditorParams {
  /** Edit this group. Without it, the editor creates a new group. */
  group?: RuleGroup;
  /** Start values for a new group, for example rules that the user selected. */
  initial?: Partial<RuleGroupDefinition>;
}

interface RuleGroupEditorContextValue {
  openEditor: (params: OpenEditorParams) => void;
  /** The "Rule groups" checkbox list for one rule, from the row menu of the rules table. */
  openGroupsMenu: (rule: { id: string; rule_id: string; name: string }) => void;
}

const RuleGroupEditorContext = createContext<RuleGroupEditorContextValue | null>(null);

/** Lets any part of the rules page open the one rule group editor. */
export const RuleGroupEditorProvider = ({ children }: { children: React.ReactNode }) => {
  const [params, setParams] = useState<OpenEditorParams | null>(null);
  const menuTitleId = useGeneratedHtmlId();
  const [menuRule, setMenuRule] = useState<{ id: string; rule_id: string; name: string } | null>(
    null
  );
  const rulesTable = useRulesTableContextOptional();
  const value = useMemo(() => ({ openEditor: setParams, openGroupsMenu: setMenuRule }), []);

  return (
    <RuleGroupEditorContext.Provider value={value}>
      {children}
      {params && (
        <RuleGroupEditorFlyout
          group={params.group}
          initial={params.initial}
          onClose={() => setParams(null)}
          onSaved={(saved) => rulesTable?.actions.setFilterOptions({ ruleGroupId: saved.id })}
        />
      )}
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
            <RuleGroupsSelectable
              ruleIds={[menuRule.id]}
              ruleRuleIds={[menuRule.rule_id]}
              onDone={() => setMenuRule(null)}
              onNewGroup={(picked) => {
                setMenuRule(null);
                setParams({ initial: { included_rule_ids: picked } });
              }}
            />
          </EuiModalBody>
        </EuiModal>
      )}
    </RuleGroupEditorContext.Provider>
  );
};

/** For code that can also run outside the rules page (for example shared row actions). */
export const useRuleGroupEditorOptional = (): RuleGroupEditorContextValue | null =>
  useContext(RuleGroupEditorContext);

export const useRuleGroupEditor = (): RuleGroupEditorContextValue => {
  const value = useContext(RuleGroupEditorContext);
  if (!value) {
    throw new Error('useRuleGroupEditor must be used inside RuleGroupEditorProvider');
  }
  return value;
};
