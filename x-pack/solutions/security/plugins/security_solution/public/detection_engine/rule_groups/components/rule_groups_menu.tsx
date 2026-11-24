/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiButtonEmpty, EuiPopover } from '@elastic/eui';
import { useRuleGroupEditor } from './rule_group_editor_context';
import { RuleGroupsSelectable } from './rule_groups_selectable';
import * as i18n from './translations';

/** "Rule groups" button for the selected rules in the utility bar of the rules table. */
export const RuleGroupsMenuButton = ({
  ruleIds,
  ruleRuleIds,
}: {
  ruleIds: string[];
  ruleRuleIds: string[];
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { openEditor } = useRuleGroupEditor();
  return (
    <EuiPopover
      aria-label={i18n.MENU_BUTTON}
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      panelPaddingSize="none"
      button={
        <EuiButtonEmpty
          size="xs"
          iconType="folder"
          onClick={() => setIsOpen(!isOpen)}
          isDisabled={!ruleIds.length}
          data-test-subj="ruleGroupsMenuButton"
        >
          {i18n.MENU_BUTTON}
        </EuiButtonEmpty>
      }
    >
      {isOpen && (
        <RuleGroupsSelectable
          ruleIds={ruleIds}
          ruleRuleIds={ruleRuleIds}
          onDone={() => setIsOpen(false)}
          onNewGroup={(picked) => openEditor({ initial: { included_rule_ids: picked } })}
        />
      )}
    </EuiPopover>
  );
};
