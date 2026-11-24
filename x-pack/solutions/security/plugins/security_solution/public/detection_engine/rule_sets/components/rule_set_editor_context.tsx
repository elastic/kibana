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
import type { RuleSet, RuleSetDefinition } from '../../../../common/api/detection_engine/rule_sets';
import { useRulesTableContextOptional } from '../../rule_management_ui/components/rules_table/rules_table/rules_table_context';
import { RuleSetEditorFlyout } from './rule_set_editor_flyout';
import { RuleSetsSelectable } from './rule_sets_selectable';

export interface OpenEditorParams {
  /** Edit this group. Without it, the editor creates a new group. */
  group?: RuleSet;
  /** Start values for a new group, for example rules that the user selected. */
  initial?: Partial<RuleSetDefinition>;
}

interface RuleSetEditorContextValue {
  openEditor: (params: OpenEditorParams) => void;
  /** The "Rule sets" checkbox list for one rule, from the row menu of the rules table. */
  openGroupsMenu: (rule: { id: string; rule_id: string; name: string }) => void;
}

const RuleSetEditorContext = createContext<RuleSetEditorContextValue | null>(null);

/** Lets any part of the rules page open the one rule set editor. */
export const RuleSetEditorProvider = ({ children }: { children: React.ReactNode }) => {
  const [params, setParams] = useState<OpenEditorParams | null>(null);
  const menuTitleId = useGeneratedHtmlId();
  const [menuRule, setMenuRule] = useState<{ id: string; rule_id: string; name: string } | null>(
    null
  );
  const rulesTable = useRulesTableContextOptional();
  const value = useMemo(() => ({ openEditor: setParams, openGroupsMenu: setMenuRule }), []);

  return (
    <RuleSetEditorContext.Provider value={value}>
      {children}
      {params && (
        <RuleSetEditorFlyout
          group={params.group}
          initial={params.initial}
          onClose={() => setParams(null)}
          onSaved={(saved) => rulesTable?.actions.setFilterOptions({ ruleSetId: saved.id })}
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
            <RuleSetsSelectable
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
    </RuleSetEditorContext.Provider>
  );
};

/** For code that can also run outside the rules page (for example shared row actions). */
export const useRuleSetEditorOptional = (): RuleSetEditorContextValue | null =>
  useContext(RuleSetEditorContext);

export const useRuleSetEditor = (): RuleSetEditorContextValue => {
  const value = useContext(RuleSetEditorContext);
  if (!value) {
    throw new Error('useRuleSetEditor must be used inside RuleSetEditorProvider');
  }
  return value;
};
