/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import {
  type AttackDiscovery,
  type AttackDiscoveryAlert,
  type Replacements,
} from '@kbn/elastic-assistant-common';
import React from 'react';

import { SummaryActions } from './summary_actions';
import { PrimaryInteractions } from './primary_interactions';

interface Props {
  attackDiscovery: AttackDiscovery | AttackDiscoveryAlert;
  isOpen: 'open' | 'closed';
  isSelected: boolean;
  setIsSelected?: ({ id, selected }: { id: string; selected: boolean }) => void;
  onToggle?: (newState: 'open' | 'closed') => void;
  replacements?: Replacements;
  setIsOpen: React.Dispatch<React.SetStateAction<'open' | 'closed'>>;
  setSelectedAttackDiscoveries: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  showAnonymized?: boolean;
}

const PanelHeaderComponent: React.FC<Props> = ({
  attackDiscovery,
  isOpen,
  isSelected,
  setIsSelected,
  onToggle,
  replacements,
  setIsOpen,
  setSelectedAttackDiscoveries,
  showAnonymized = false,
}) => (
  <EuiFlexGroup
    alignItems="flexStart"
    data-test-subj="panelHeader"
    gutterSize="none"
    justifyContent="spaceBetween"
    responsive={false}
    wrap={true}
  >
    <EuiFlexItem grow={false}>
      <PrimaryInteractions
        attackDiscovery={attackDiscovery}
        isOpen={isOpen}
        isSelected={isSelected}
        onToggle={onToggle}
        replacements={replacements}
        setIsOpen={setIsOpen}
        setIsSelected={setIsSelected}
        showAnonymized={showAnonymized}
      />
    </EuiFlexItem>

    <EuiFlexItem grow={false}>
      <SummaryActions
        attackDiscovery={attackDiscovery}
        replacements={replacements}
        setSelectedAttackDiscoveries={setSelectedAttackDiscoveries}
      />
    </EuiFlexItem>
  </EuiFlexGroup>
);

PanelHeaderComponent.displayName = 'PanelHeader';

export const PanelHeader = React.memo(PanelHeaderComponent);
