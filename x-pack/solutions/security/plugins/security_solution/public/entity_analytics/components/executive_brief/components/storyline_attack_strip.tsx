/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import type { BriefSnapshot } from '../../../../../common/entity_analytics/executive_brief/types';
import { useMitreConfiguration } from '../../../../common/hooks/mitre/use_mitre_configuration';

/**
 * Per-storyline attack stages: ordered chips of only the observed tactics, in kill-chain order
 * (managed MITRE order, v19-aware names), separated by arrows. Chips are static so they print.
 */
export const StorylineAttackStrip: React.FC<{
  tacticIds: string[];
  snapshot: BriefSnapshot;
}> = ({ tacticIds, snapshot }) => {
  const { tactics } = useMitreConfiguration({ types: ['tactic'] });

  const ordered = useMemo(() => {
    const byId = new Map(tactics.map(({ id, name, position }) => [id, { name, position }]));
    return tacticIds
      .map((id) => {
        const fromConfig = byId.get(id);
        const fromSnapshot = snapshot.blindSpots.attackStages.stages.find(
          (stage) => stage.tacticId === id
        );
        return {
          id,
          name: fromConfig?.name ?? fromSnapshot?.tacticName ?? id,
          position: fromConfig?.position ?? fromSnapshot?.position ?? Number.MAX_SAFE_INTEGER,
        };
      })
      .sort((a, b) => a.position - b.position);
  }, [tactics, tacticIds, snapshot]);

  if (ordered.length === 0) return null;

  return (
    <div data-test-subj="executiveBriefAttackStrip">
      <EuiTitle size="xxs">
        <h5>{'Attack stages'}</h5>
      </EuiTitle>
      <EuiSpacer size="xs" />
      <EuiFlexGroup gutterSize="xs" wrap responsive={false} alignItems="center">
        {ordered.map(({ id, name }, index) => (
          <React.Fragment key={id}>
            {index > 0 && (
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued" aria-hidden="true">
                  {'→'}
                </EuiText>
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={false}>
              <EuiBadge color="hollow" data-test-subj="executiveBriefTacticChip">
                {name}
              </EuiBadge>
            </EuiFlexItem>
          </React.Fragment>
        ))}
      </EuiFlexGroup>
    </div>
  );
};
