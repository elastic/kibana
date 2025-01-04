/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import React from 'react';
import { css } from '@emotion/react';

import type { IlmExplainPhaseCounts, IlmPhase } from '../../../../../../types';
import { getPatternIlmPhaseDescription } from './utils/get_pattern_ilm_phase_description';

const styles = {
  phaseCounts: css({
    display: 'inline-flex',
  }),
};

export const phases: IlmPhase[] = ['hot', 'unmanaged', 'warm', 'cold', 'frozen'];

interface Props {
  ilmExplainPhaseCounts: IlmExplainPhaseCounts;
  pattern: string;
}

const IlmPhaseCountsComponent: React.FC<Props> = ({ ilmExplainPhaseCounts, pattern }) => (
  <EuiFlexGroup css={styles.phaseCounts} data-test-subj="ilmPhaseCounts" gutterSize="s">
    {phases.map((phase) =>
      ilmExplainPhaseCounts[phase] != null && ilmExplainPhaseCounts[phase] > 0 ? (
        <EuiFlexItem key={phase} grow={false}>
          <EuiToolTip
            content={getPatternIlmPhaseDescription({
              indices: ilmExplainPhaseCounts[phase],
              pattern,
              phase,
            })}
          >
            <EuiBadge color="hollow">{`${phase} (${ilmExplainPhaseCounts[phase]})`}</EuiBadge>
          </EuiToolTip>
        </EuiFlexItem>
      ) : null
    )}
  </EuiFlexGroup>
);

IlmPhaseCountsComponent.displayName = 'IlmPhaseCountsComponent';

export const IlmPhaseCounts = React.memo(IlmPhaseCountsComponent);
