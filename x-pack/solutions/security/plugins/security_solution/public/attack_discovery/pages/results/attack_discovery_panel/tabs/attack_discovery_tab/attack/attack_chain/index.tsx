/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiPanel, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { memo, useMemo } from 'react';

import type { AttackDiscovery } from '@kbn/elastic-assistant-common';
import { getTacticMetadata } from '@kbn/elastic-assistant-common/impl/utils/attack_discovery_helpers';
import { Tactic } from './tactic';
import { TacticVerticalRow } from './tactic_vertical_row';

interface AttackChainComponentProps {
  /** MITRE ATT&CK tactics associated with the discovery */
  attackTactics: AttackDiscovery['mitreAttackTactics'];
  /** Switches between horizontal chain and vertical list layout */
  isVertical?: boolean;
}

interface ScrollableContainerProps {
  children: React.ReactNode;
  isVertical?: boolean;
}

/** Adds horizontal scrolling when rendering the chain layout */
const ScrollableContainer = memo(({ children, isVertical }: ScrollableContainerProps) => {
  if (isVertical) return <>{children}</>;

  return (
    <EuiPanel
      color="subdued"
      data-test-subj="attackChain"
      hasBorder
      css={css`
        height: 71px;
        overflow-x: auto;
        overflow-y: hidden;
        scrollbar-width: thin;
      `}
    >
      {children}
    </EuiPanel>
  );
});
ScrollableContainer.displayName = 'ScrollableContainer';

/** Displays the MITRE ATT&CK tactic flow for an attack discovery */
const AttackChainComponent: React.FC<AttackChainComponentProps> = ({
  attackTactics,
  isVertical,
}) => {
  const { euiTheme } = useEuiTheme();

  const styles = useMemo(() => {
    return {
      // Padding only needed for vertical layout alignment
      verticalPadding: css`
        padding: ${euiTheme.size.base} ${euiTheme.size.m};
      `,
    };
  }, [euiTheme]);

  const tacticMetadata = useMemo(() => getTacticMetadata(attackTactics), [attackTactics]);

  if (tacticMetadata.length === 0) return null;

  return (
    <ScrollableContainer isVertical={isVertical}>
      <EuiFlexGroup
        gutterSize="none"
        responsive={false}
        wrap={false}
        direction={isVertical ? 'column' : 'row'}
        css={isVertical ? styles.verticalPadding : undefined}
        data-test-subj="attackChainTactics"
      >
        {tacticMetadata.map((tactic, i) => (
          <EuiFlexItem grow={false} key={tactic.name}>
            {isVertical ? (
              <TacticVerticalRow
                detected={tactic.detected}
                tactic={tactic.name}
                isFirst={i === 0}
                isLast={i === tacticMetadata.length - 1}
              />
            ) : (
              <Tactic detected={tactic.detected} tactic={tactic.name} />
            )}
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </ScrollableContainer>
  );
};

AttackChainComponent.displayName = 'AttackChain';

export const AttackChain = memo(AttackChainComponent);
