/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiEmptyPrompt, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText } from '@elastic/eui';
import type {
  BriefSnapshot,
  ExecutiveBrief,
} from '../../../../../common/entity_analytics/executive_brief/types';
import { EntityBadge } from '../../entity_badge';
import { ClaimFlag, useClaimFlags } from '../components/brief_context';
import { SectionErrorBoundary } from '../components/section_error_boundary';
import { SectionTitle } from '../components/section_title';
import { StorylineCard } from './storyline_card';
import {
  BRIEF_BLOCK_ATTRIBUTE,
  BRIEF_KEEP_WITH_NEXT_ATTRIBUTE,
  EXECUTIVE_BRIEF_SCOPE_ID,
  EXECUTIVE_BRIEF_SECTION_IDS,
} from '../constants';
import { TEST_IDS } from '../test_ids';
import { getStoryline } from '../utils/resolve_evidence';

interface StorylinesProps {
  snapshot: BriefSnapshot;
  brief: ExecutiveBrief;
}

/**
 * Fallback marker below a card whose narrative was flagged by validation. Cards may also render
 * `ClaimFlag` inline next to the claim; this note only shows when the card does not.
 */
const StorylineFlagNote: React.FC<{ index: number }> = ({ index }) => {
  const flags = useClaimFlags(`storylines[${index}]`);
  if (flags.length === 0) return null;
  return (
    <EuiText size="xs" color="subdued" data-test-subj="executiveBriefStorylineFlagNote">
      <ClaimFlag claimPath={`storylines[${index}]`} />
      {' Some wording in this threat could not be fully verified against the evidence.'}
    </EuiText>
  );
};

export const Storylines: React.FC<StorylinesProps> = ({ snapshot, brief }) => {
  const rendered = brief.storylines
    .map((narrative, narrativeIndex) => ({
      narrative,
      narrativeIndex,
      storyline: getStoryline(snapshot, narrative.storylineId),
    }))
    .filter(
      (item): item is typeof item & { storyline: NonNullable<typeof item.storyline> } =>
        item.storyline !== undefined
    );
  const { otherNotableEntities } = snapshot.storylines;

  return (
    <section id={EXECUTIVE_BRIEF_SECTION_IDS.storylines} data-test-subj="executiveBriefStorylines">
      <div
        {...{ [BRIEF_BLOCK_ATTRIBUTE]: 'storylines-title', [BRIEF_KEEP_WITH_NEXT_ATTRIBUTE]: '' }}
      >
        <SectionTitle index={2} title="Priority threats" subtitle="What's happening?" />
      </div>
      {rendered.length === 0 ? (
        <EuiEmptyPrompt
          iconType="timeline"
          titleSize="xs"
          title={<h4>{'No connected activity'}</h4>}
          body={<p>{'No priority threats were found in this time range.'}</p>}
          data-test-subj={TEST_IDS.empty}
        />
      ) : (
        <EuiFlexGroup direction="column" gutterSize="l">
          {rendered.map(({ narrative, narrativeIndex, storyline }) => (
            <EuiFlexItem key={storyline.evidenceId}>
              <div {...{ [BRIEF_BLOCK_ATTRIBUTE]: 'storyline' }}>
                <SectionErrorBoundary
                  fallbackText={`Threat ${storyline.rank} could not be displayed`}
                >
                  <StorylineCard
                    snapshot={snapshot}
                    storyline={storyline}
                    narrative={narrative}
                    decisions={brief.decisions
                      .map((decision, index) => ({ decision, index }))
                      .filter(({ decision }) => decision.relatesTo === storyline.evidenceId)}
                  />
                </SectionErrorBoundary>
                <StorylineFlagNote index={narrativeIndex} />
              </div>
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      )}
      {brief.crossStorylineConclusion && (
        <div {...{ [BRIEF_BLOCK_ATTRIBUTE]: 'cross-storyline' }}>
          <EuiSpacer size="m" />
          <EuiText size="s" data-test-subj="executiveBriefCrossStoryline">
            <p>
              {brief.crossStorylineConclusion.statement}{' '}
              <ClaimFlag claimPath="crossStorylineConclusion" />
            </p>
          </EuiText>
        </div>
      )}
      {otherNotableEntities.length > 0 && (
        <div {...{ [BRIEF_BLOCK_ATTRIBUTE]: 'other-notable' }}>
          <EuiSpacer size="m" />
          <EuiFlexGroup
            gutterSize="xs"
            wrap
            alignItems="center"
            responsive={false}
            data-test-subj="executiveBriefOtherNotable"
          >
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                {'Other notable entities'}
              </EuiText>
            </EuiFlexItem>
            {otherNotableEntities.map((euid) => {
              const entity = snapshot.entities[euid];
              return (
                <EuiFlexItem grow={false} key={euid}>
                  <EntityBadge
                    entity={{
                      type: entity?.type ?? 'generic',
                      name: entity?.name ?? euid,
                      id: euid,
                    }}
                    scopeId={EXECUTIVE_BRIEF_SCOPE_ID}
                  />
                </EuiFlexItem>
              );
            })}
          </EuiFlexGroup>
        </div>
      )}
    </section>
  );
};
