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
import { css } from '@emotion/react';
import React from 'react';

import { Subtitle } from './subtitle';
import { Title } from './title';

const SUBTITLE_LEFT_MARGIN = 77; // aligns with the schedule icon or title text, without adding to the height of the title

interface Props {
  attackDiscovery: AttackDiscovery | AttackDiscoveryAlert;
  isOpen: 'open' | 'closed';
  isSelected: boolean;
  onToggle?: (newState: 'open' | 'closed') => void;
  replacements?: Replacements;
  setIsOpen: React.Dispatch<React.SetStateAction<'open' | 'closed'>>;
  setIsSelected?: ({ id, selected }: { id: string; selected: boolean }) => void;
  showAnonymized?: boolean;
}

const PrimaryInteractionsComponent: React.FC<Props> = ({
  attackDiscovery,
  isOpen,
  isSelected,
  onToggle,
  replacements,
  setIsOpen,
  setIsSelected,
  showAnonymized = false,
}) => (
  <EuiFlexGroup
    data-test-subj="primaryInteractions"
    direction="column"
    gutterSize="none"
    responsive={false}
    wrap={true}
  >
    <EuiFlexItem grow={false}>
      <Title
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

    <EuiFlexItem
      css={css`
        margin-left: ${SUBTITLE_LEFT_MARGIN}px;
      `}
      grow={false}
    >
      <Subtitle attackDiscovery={attackDiscovery} />
    </EuiFlexItem>
  </EuiFlexGroup>
);

PrimaryInteractionsComponent.displayName = 'PrimaryInteractions';

export const PrimaryInteractions = React.memo(PrimaryInteractionsComponent);
