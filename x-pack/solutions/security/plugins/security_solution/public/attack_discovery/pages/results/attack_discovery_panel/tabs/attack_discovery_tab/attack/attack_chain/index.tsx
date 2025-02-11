/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useMemo } from 'react';

import type { AttackDiscovery } from '@kbn/elastic-assistant-common';
import { Tactic } from './tactic';
import { getTacticMetadata } from '../../../../../../../helpers';

interface Props {
  attackDiscovery: AttackDiscovery;
}

const AttackChainComponent: React.FC<Props> = ({ attackDiscovery }) => {
  const tacticMetadata = useMemo(() => getTacticMetadata(attackDiscovery), [attackDiscovery]);

  return (
    <EuiPanel
      color="subdued"
      data-test-subj="attackChain"
      hasBorder={true}
      css={css`
        height: 71px;
        overflow-x: auto;
        overflow-y: hidden;
        scrollbar-width: thin;
      `}
      paddingSize="l"
    >
      <EuiFlexGroup gutterSize="none">
        {tacticMetadata.map((tactic, i) => (
          <EuiFlexItem grow={false} key={tactic.name}>
            <Tactic detected={tactic.detected} tactic={tactic.name} />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </EuiPanel>
  );
};

AttackChainComponent.displayName = 'AttackChain';

export const AttackChain = React.memo(AttackChainComponent);
