/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { AiButtonEmpty } from '@kbn/shared-ux-ai-components';
import type {
  BriefConfidence,
  BriefSeverity,
  BriefSnapshot,
  ExecutiveBrief,
  ExecutiveBriefDecision,
  ExecutiveBriefStoryline,
  Storyline,
} from '../../../../../common/entity_analytics/executive_brief/types';
import { useKibana } from '../../../../common/lib/kibana';
import { useIsNewFlyoutEnabled } from '../../../../common/hooks/use_is_new_flyout_enabled';
import { FLYOUT_TYPE } from '../../../../common/lib/telemetry/events/flyout_v2/types';
import { useFlyoutApi } from '../../../../flyout_v2/use_flyout_api';
import { EntityBadge } from '../../entity_badge';
import { BRIEF_CUT_ATTRIBUTE, EXECUTIVE_BRIEF_SCOPE_ID } from '../constants';
import { TEST_IDS } from '../test_ids';
import { useIsPrintMode, useStorylineOpenRequest } from '../components/brief_context';
import { DecisionAccordion } from '../components/decision_accordion';
import { RESPONSE_STATE_LABEL, ResponseRow } from '../components/response_row';
import { StorylineGraph } from '../components/storyline_graph';
import { StorylineSteps } from '../components/storyline_steps';
import { getTacticName } from '../utils/resolve_evidence';
import { buildStorylineTriagePrompt, buildTriageMessage } from '../utils/triage_prompts';

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

const CUT = { [BRIEF_CUT_ATTRIBUTE]: '' };

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
  /** Narratives for every threat, so the triage prompt can name related threats. */
  brief?: Pick<ExecutiveBrief, 'storylines'>;
  /** Expand the card regardless of user toggling (PDF/print capture). Also implied by print mode. */
  forceExpanded?: boolean;
}

export const StorylineCard: React.FC<StorylineCardProps> = ({
  snapshot,
  storyline,
  narrative,
  decisions,
  brief,
  forceExpanded = false,
}) => {
  const { agentBuilder } = useKibana().services;
  const canTriage = Boolean(agentBuilder?.openChat);
  const bodyId = useGeneratedHtmlId({ prefix: 'executiveBriefStorylineBody' });
  const isPrintMode = useIsPrintMode();
  const [isOpen, setIsOpen] = useState(storyline.rank === 1);
  const openRequest = useStorylineOpenRequest();
  useEffect(() => {
    if (openRequest?.rank === storyline.rank) setIsOpen(true);
  }, [openRequest, storyline.rank]);
  const expanded = forceExpanded || isPrintMode || isOpen;
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

  const toggle = () => setIsOpen(!expanded);
  const toggleLabel = expanded ? 'Hide threat details' : 'Show threat details';
  const triage = () =>
    agentBuilder?.openChat?.({
      autoSendInitialMessage: false,
      newConversation: true,
      initialMessage: buildTriageMessage(buildStorylineTriagePrompt(storyline, snapshot, brief)),
      sessionTag: 'security',
    });
  const [topDecision] = decisions;
  const tactics = storyline.tacticIds.map((id) => getTacticName(snapshot, id)).join(' → ');
  const severityLabel = storyline.severity.charAt(0).toUpperCase() + storyline.severity.slice(1);

  // The header stays visible when collapsed and holds everything actionable: the entities
  // (each opens its flyout), the next step and the triage action. Details sit below.
  const header = (
    <div data-test-subj="executiveBriefStorylinePreview">
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiBadge color={severityColor} data-test-subj="executiveBriefSeverity">
            {severityLabel}
          </EuiBadge>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h4>
              {isPrintMode ? (
                narrative.title
              ) : (
                <EuiLink
                  color="text"
                  onClick={toggle}
                  aria-expanded={expanded}
                  aria-controls={bodyId}
                  data-test-subj={`executiveBriefStorylineTitle-${storyline.rank}`}
                >
                  {narrative.title}
                </EuiLink>
              )}
            </h4>
          </EuiTitle>
        </EuiFlexItem>
        {!isPrintMode && canTriage && (
          <EuiFlexItem grow={false}>
            <AiButtonEmpty
              size="xs"
              iconType="productAgent"
              onClick={triage}
              data-test-subj={`executiveBriefStorylineTriage-${storyline.rank}`}
            >
              {'Triage with AI Agent'}
            </AiButtonEmpty>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiSpacer size="xs" />
      <EuiText size="xs" color="subdued" data-test-subj="executiveBriefStorylineMeta">
        <span data-test-subj="executiveBriefStorylineResponseState">
          {RESPONSE_STATE_LABEL[storyline.response.state]}
        </span>
        {' · '}
        <span data-test-subj="executiveBriefConfidence">
          {CONFIDENCE_LABEL[narrative.confidence]}
        </span>
        {tactics && (
          <>
            {' · '}
            <span data-test-subj="executiveBriefStorylineTactics">{tactics}</span>
          </>
        )}
      </EuiText>
      <EuiSpacer size="s" />
      <EuiFlexGroup
        gutterSize="xs"
        wrap
        responsive={false}
        data-test-subj="executiveBriefPreviewEntities"
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
      {topDecision && (
        <>
          <EuiSpacer size="s" />
          <EuiText size="s" data-test-subj="executiveBriefStorylineNextStep">
            <strong>{'Next step: '}</strong>
            {topDecision.decision.action}
          </EuiText>
        </>
      )}
      {!expanded && (
        <>
          <EuiSpacer size="xs" />
          <EuiText
            size="s"
            color="subdued"
            data-test-subj="executiveBriefNarrativePreview"
            css={css`
              display: -webkit-box;
              -webkit-line-clamp: 2;
              -webkit-box-orient: vertical;
              overflow: hidden;
            `}
          >
            {narrative.narrative}
          </EuiText>
        </>
      )}
    </div>
  );

  return (
    <div data-test-subj={`executiveBriefStorylineCard-${storyline.rank}`}>
      <EuiPanel
        hasBorder
        paddingSize="l"
        data-test-subj={TEST_IDS.storylineCard(storyline.evidenceId)}
      >
        <EuiFlexGroup gutterSize="s" alignItems="flexStart" responsive={false}>
          {!isPrintMode && (
            <EuiFlexItem grow={false}>
              <EuiToolTip content={toggleLabel} disableScreenReaderOutput>
                <EuiButtonIcon
                  iconType={expanded ? 'chevronSingleDown' : 'chevronSingleRight'}
                  color="text"
                  onClick={toggle}
                  aria-expanded={expanded}
                  aria-controls={bodyId}
                  aria-label={toggleLabel}
                  data-test-subj={`executiveBriefStorylineToggle-${storyline.rank}`}
                />
              </EuiToolTip>
            </EuiFlexItem>
          )}
          <EuiFlexItem>
            {header}
            {expanded && (
              <div id={bodyId} data-test-subj={`executiveBriefStorylineBody-${storyline.rank}`}>
                <EuiSpacer size="m" />
                <EuiText size="s">
                  <p>{narrative.narrative}</p>
                  <p>
                    <strong>{'Why it matters: '}</strong>
                    {narrative.whyItMatters}
                  </p>
                </EuiText>
                <EuiSpacer size="m" />
                <div {...CUT}>
                  <StorylineGraph storyline={storyline} snapshot={snapshot} />
                  {isNewFlyoutEnabled && focal && (
                    <EuiButtonEmpty
                      size="xs"
                      iconType="external"
                      onClick={openGraphView}
                      data-test-subj="executiveBriefOpenGraph"
                    >
                      {'Open in graph view'}
                    </EuiButtonEmpty>
                  )}
                </div>
                <EuiSpacer size="m" />
                <div {...CUT}>
                  <EuiTitle size="xxs">
                    <h5>{'Timeline'}</h5>
                  </EuiTitle>
                  <EuiSpacer size="s" />
                </div>
                <StorylineSteps storyline={storyline} snapshot={snapshot} />
                <EuiSpacer size="m" />
                <div {...CUT}>
                  <ResponseRow response={storyline.response} />
                </div>
                {decisions.length > 0 && (
                  <>
                    <EuiSpacer size="m" />
                    <div {...CUT}>
                      <EuiTitle size="xxs">
                        <h5>{'Recommended actions'}</h5>
                      </EuiTitle>
                    </div>
                    {decisions.map(({ decision, index }) => (
                      <div key={`${decision.action}-${index}`} {...CUT}>
                        <DecisionAccordion decision={decision} index={index} inline />
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </div>
  );
};
