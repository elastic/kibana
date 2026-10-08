/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import { EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import type { BriefSnapshot } from '../../../../../common/entity_analytics/executive_brief/types';
import { useMitreConfiguration } from '../../../../common/hooks/mitre/use_mitre_configuration';
import { MitreAttackChain } from '../../anomalies/mitre/components/mitre_attack_chain';

/**
 * Per-storyline attack-stage strip: the EA MitreAttackChain keyed by (v19-aware) tactic name, plus a
 * text summary because the hover chips do not print.
 */
export const StorylineAttackStrip: React.FC<{
  tacticIds: string[];
  snapshot: BriefSnapshot;
}> = ({ tacticIds, snapshot }) => {
  const { tactics } = useMitreConfiguration({ types: ['tactic'] });

  const orderedNames = useMemo(() => {
    const byId = new Map(tactics.map(({ id, name, position }) => [id, { name, position }]));
    return tacticIds
      .map((id) => {
        const fromConfig = byId.get(id);
        const fromSnapshot = snapshot.blindSpots.attackStages.stages.find(
          (stage) => stage.tacticId === id
        );
        return {
          name: fromConfig?.name ?? fromSnapshot?.tacticName ?? id,
          position: fromConfig?.position ?? fromSnapshot?.position ?? Number.MAX_SAFE_INTEGER,
        };
      })
      .sort((a, b) => a.position - b.position)
      .map(({ name }) => name);
  }, [tactics, tacticIds, snapshot]);

  if (orderedNames.length === 0) return null;

  return (
    <div data-test-subj="executiveBriefAttackStrip">
      <EuiTitle size="xxs">
        <h5>{'Attack stages'}</h5>
      </EuiTitle>
      <EuiSpacer size="xs" />
      <MitreAttackChain triggeredTactics={orderedNames} />
      <EuiSpacer size="xs" />
      <EuiText size="xs" color="subdued">
        {orderedNames.join(' → ')}
      </EuiText>
    </div>
  );
};
