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
import { SectionErrorBoundary } from '../components/section_error_boundary';
import { SectionTitle } from '../components/section_title';
import { StorylineCard } from './storyline_card';
import { EXECUTIVE_BRIEF_SCOPE_ID, EXECUTIVE_BRIEF_SECTION_IDS } from '../constants';
import { TEST_IDS } from '../test_ids';
import { getStoryline } from '../utils/resolve_evidence';

interface StorylinesProps {
  snapshot: BriefSnapshot;
  brief: ExecutiveBrief;
}

export const Storylines: React.FC<StorylinesProps> = ({ snapshot, brief }) => {
  const rendered = brief.storylines
    .map((narrative) => ({ narrative, storyline: getStoryline(snapshot, narrative.storylineId) }))
    .filter(
      (item): item is typeof item & { storyline: NonNullable<typeof item.storyline> } =>
        item.storyline !== undefined
    );
  const { otherNotableEntities } = snapshot.storylines;

  return (
    <section id={EXECUTIVE_BRIEF_SECTION_IDS.storylines} data-test-subj="executiveBriefStorylines">
      <SectionTitle index={2} title="Storylines" subtitle="What's happening?" />
      {rendered.length === 0 ? (
        <EuiEmptyPrompt
          iconType="timeline"
          titleSize="xs"
          title={<h4>{'No connected activity'}</h4>}
          body={<p>{'No entities were linked into a storyline in this time range.'}</p>}
          data-test-subj={TEST_IDS.empty}
        />
      ) : (
        <EuiFlexGroup direction="column" gutterSize="l">
          {rendered.map(({ narrative, storyline }) => (
            <EuiFlexItem key={storyline.evidenceId}>
              <SectionErrorBoundary
                fallbackText={`Storyline ${storyline.rank} could not be displayed`}
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
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      )}
      {brief.crossStorylineConclusion && (
        <>
          <EuiSpacer size="m" />
          <EuiText size="s" data-test-subj="executiveBriefCrossStoryline">
            <p>{brief.crossStorylineConclusion.statement}</p>
          </EuiText>
        </>
      )}
      {otherNotableEntities.length > 0 && (
        <>
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
        </>
      )}
    </section>
  );
};
