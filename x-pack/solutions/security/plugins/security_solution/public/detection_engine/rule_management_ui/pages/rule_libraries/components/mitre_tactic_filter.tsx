/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiFilterButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiSelectable,
  useEuiTheme,
} from '@elastic/eui';
import type { EuiSelectableOption } from '@elastic/eui';
import { tacticOrder } from '../../../../../../common/detection_engine/mitre/mitre_tactics_order';
import { tactics } from '../../../../../../common/detection_engine/mitre/mitre_tactics_techniques';
import * as i18n from '../translations';

const TACTICS_POPOVER_WIDTH = 300;

// The tactics in the order of the ATT&CK matrix, which is how the coverage overview lists them.
const ORDERED_TACTICS = [...tactics].sort((a, b) => {
  const position = (id: string) => {
    const index = tacticOrder.indexOf(id);
    return index === -1 ? tacticOrder.length : index;
  };
  return position(a.id) - position(b.id);
});

interface MitreTacticFilterProps {
  // Tactic ids, such as TA0002.
  selected: readonly string[];
  onChange: (tacticIds: string[]) => void;
}

export const MitreTacticFilter = ({ selected, onChange }: MitreTacticFilterProps) => {
  const { euiTheme } = useEuiTheme();
  const [isOpen, setIsOpen] = useState(false);

  const options = useMemo<EuiSelectableOption[]>(
    () =>
      ORDERED_TACTICS.map(({ id, name }) => ({
        key: id,
        label: name,
        checked: selected.includes(id) ? 'on' : undefined,
      })),
    [selected]
  );

  const triggerButton = (
    <EuiFilterButton
      grow
      iconType="chevronSingleDown"
      onClick={() => setIsOpen((current) => !current)}
      numFilters={ORDERED_TACTICS.length}
      isSelected={isOpen}
      hasActiveFilters={selected.length > 0}
      numActiveFilters={selected.length}
      data-test-subj="ruleLibraryTacticFilter"
    >
      {i18n.TACTIC_FILTER}
    </EuiFilterButton>
  );

  return (
    <EuiPopover
      ownFocus
      button={triggerButton}
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      panelPaddingSize="none"
      repositionOnScroll
      panelProps={{ 'data-test-subj': 'ruleLibraryTacticPopover' }}
      aria-label={i18n.TACTIC_FILTER_ARIA_LABEL}
    >
      <EuiSelectable
        aria-label={i18n.TACTIC_FILTER_ARIA_LABEL}
        options={options}
        onChange={(updated) =>
          onChange(updated.flatMap(({ key, checked }) => (key && checked === 'on' ? [key] : [])))
        }
        listProps={{ paddingSize: 'none' }}
        data-test-subj="ruleLibraryTacticOptions"
      >
        {(list) => (
          <div css={{ width: TACTICS_POPOVER_WIDTH, padding: euiTheme.size.s }}>
            <EuiFlexGroup direction="column" gutterSize="s" responsive={false}>
              <EuiFlexItem>{list}</EuiFlexItem>
            </EuiFlexGroup>
          </div>
        )}
      </EuiSelectable>
    </EuiPopover>
  );
};
