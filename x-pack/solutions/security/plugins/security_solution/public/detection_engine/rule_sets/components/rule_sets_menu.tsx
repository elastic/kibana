/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiButtonEmpty, EuiPopover } from '@elastic/eui';
import { useRuleSetEditor } from './rule_set_editor_context';
import { RuleSetsSelectable } from './rule_sets_selectable';
import * as i18n from './translations';

/** "Rule sets" button for the selected rules in the utility bar of the rules table. */
export const RuleSetsMenuButton = ({
  ruleIds,
  ruleRuleIds,
}: {
  ruleIds: string[];
  ruleRuleIds: string[];
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { openSaveDialog } = useRuleSetEditor();
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
          data-test-subj="ruleSetsMenuButton"
        >
          {i18n.MENU_BUTTON}
        </EuiButtonEmpty>
      }
    >
      {isOpen && (
        <RuleSetsSelectable
          ruleIds={ruleIds}
          ruleRuleIds={ruleRuleIds}
          onDone={() => setIsOpen(false)}
          onNewGroup={(picked) => {
            setIsOpen(false);
            openSaveDialog({
              rules: { conditions: {}, included_rule_ids: picked, excluded_rule_ids: [] },
              hint: i18n.HINT_PICKED(picked.length),
            });
          }}
        />
      )}
    </EuiPopover>
  );
};
