/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import type {
  BriefConfidence,
  BriefSeverity,
  BriefSnapshot,
  ExecutiveBriefDecision,
  ExecutiveBriefStoryline,
  Storyline,
} from '../../../../../common/entity_analytics/executive_brief/types';
import { useIsNewFlyoutEnabled } from '../../../../common/hooks/use_is_new_flyout_enabled';
import { FLYOUT_TYPE } from '../../../../common/lib/telemetry/events/flyout_v2/types';
import { useFlyoutApi } from '../../../../flyout_v2/use_flyout_api';
import { EntityBadge } from '../../entity_badge';
import { EXECUTIVE_BRIEF_SCOPE_ID } from '../constants';
import { TEST_IDS } from '../test_ids';
import { DecisionAccordion } from '../components/decision_accordion';
import { ExposureColumn } from '../components/exposure_column';
import { ResponseRow, ResponseStateBadge } from '../components/response_row';
import { StorylineAttackStrip } from '../components/storyline_attack_strip';
import { StorylineGraph } from '../components/storyline_graph';
import { StorylineSteps } from '../components/storyline_steps';

const useSeverityColor = (severity: BriefSeverity): string => {
  const { euiTheme } = useEuiTheme();
  const { danger, risk, warning, neutral } = euiTheme.colors.severity;
  return { critical: danger, high: risk, medium: warning, low: neutral }[severity];
};

const CONFIDENCE_LABEL: Record<BriefConfidence, string> = {
  high: 'High confidence',
  medium: 'Medium confidence',
  low: 'Low confidence',
};

const ENTITY_FLYOUT_TYPES = {
  user: FLYOUT_TYPE.USER,
  host: FLYOUT_TYPE.HOST,
  service: FLYOUT_TYPE.SERVICE,
  generic: FLYOUT_TYPE.GENERIC,
} as const;

interface StorylineCardProps {
  snapshot: BriefSnapshot;
  storyline: Storyline;
  narrative: ExecutiveBriefStoryline;
  decisions: Array<{ decision: ExecutiveBriefDecision; index: number }>;
}

export const StorylineCard: React.FC<StorylineCardProps> = ({
  snapshot,
  storyline,
  narrative,
  decisions,
}) => {
  const severityColor = useSeverityColor(storyline.severity);
  const isNewFlyoutEnabled = useIsNewFlyoutEnabled();
  const { openEntityGraphView, openEntityFlyout } = useFlyoutApi();
  const focalEuid = storyline.entityEuids[0];
  const focal = focalEuid ? snapshot.entities[focalEuid] : undefined;

  const openGraphView = () => {
    if (!focal) return;
    openEntityGraphView({
      entityId: focal.euid,
      entityName: focal.name,
      scopeId: EXECUTIVE_BRIEF_SCOPE_ID,
      flyoutType: ENTITY_FLYOUT_TYPES[focal.type],
      onShowEntity: ({ engineType, entityId, entityName }) =>
        openEntityFlyout({
          engineType: engineType ?? focal.type,
          entityId,
          entityName: entityName ?? entityId,
          scopeId: EXECUTIVE_BRIEF_SCOPE_ID,
          contextID: EXECUTIVE_BRIEF_SCOPE_ID,
        }),
    });
  };

  return (
    <EuiPanel
      hasBorder
      paddingSize="l"
      data-test-subj={TEST_IDS.storylineCard(storyline.evidenceId)}
    >
      <EuiFlexGroup gutterSize="s" alignItems="center" wrap responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiBadge color={severityColor} data-test-subj="executiveBriefSeverity">
            {storyline.severity.charAt(0).toUpperCase() + storyline.severity.slice(1)}
          </EuiBadge>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h4>{narrative.title}</h4>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow" data-test-subj="executiveBriefConfidence">
            {CONFIDENCE_LABEL[narrative.confidence]}
          </EuiBadge>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <ResponseStateBadge state={storyline.response.state} />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiFlexGroup
        gutterSize="xs"
        wrap
        responsive={false}
        data-test-subj="executiveBriefEntityChips"
      >
        {storyline.entityEuids.map((euid) => {
          const entity = snapshot.entities[euid];
          return (
            <EuiFlexItem grow={false} key={euid}>
              <EntityBadge
                entity={{ type: entity?.type ?? 'generic', name: entity?.name ?? euid, id: euid }}
                scopeId={EXECUTIVE_BRIEF_SCOPE_ID}
              />
            </EuiFlexItem>
          );
        })}
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiText size="s">
        <p>{narrative.narrative}</p>
        <p>
          <strong>{'Why it matters: '}</strong>
          {narrative.whyItMatters}
        </p>
      </EuiText>
      <EuiSpacer size="m" />
      <EuiFlexGroup gutterSize="l" responsive>
        <EuiFlexItem grow={2}>
          <StorylineGraph storyline={storyline} snapshot={snapshot} />
          {isNewFlyoutEnabled && focal && (
            <EuiButtonEmpty
              size="xs"
              iconType="popout"
              onClick={openGraphView}
              data-test-subj="executiveBriefOpenGraph"
            >
              {'Open in graph view'}
            </EuiButtonEmpty>
          )}
        </EuiFlexItem>
        <EuiFlexItem grow={1}>
          <ExposureColumn storyline={storyline} snapshot={snapshot} />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <StorylineAttackStrip tacticIds={storyline.tacticIds} snapshot={snapshot} />
      <EuiSpacer size="m" />
      <EuiTitle size="xxs">
        <h5>{'Timeline'}</h5>
      </EuiTitle>
      <EuiSpacer size="s" />
      <StorylineSteps storyline={storyline} snapshot={snapshot} />
      <EuiSpacer size="m" />
      <ResponseRow response={storyline.response} />
      {decisions.length > 0 && (
        <>
          <EuiSpacer size="m" />
          {decisions.map(({ decision, index }) => (
            <DecisionAccordion
              key={`${decision.action}-${index}`}
              decision={decision}
              index={index}
              inline
            />
          ))}
        </>
      )}
    </EuiPanel>
  );
};
