/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiSuperSelect,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import { KbnDangerCallout, KbnInfoCallout } from '@kbn/ui-callout';
import { AiButton, AiIcon } from '@kbn/shared-ux-ai-components';
import type { BriefRange } from '../../../../../common/entity_analytics/executive_brief/constants';
import type {
  BriefJobStage,
  BriefResponse,
} from '../../../../../common/entity_analytics/executive_brief/document';
import { documentFlyoutHistoryKey } from '../../../../flyout_v2/shared/constants/flyout_history';
import { BriefActionsProvider } from '../actions/brief_actions_context';
import { RecommendedActions } from '../brief/actions/recommended_actions';
import { AtAGlance } from '../brief/at_a_glance/at_a_glance';
import { PriorityThreats } from '../brief/threats/priority_threats';
import { BasedOn } from '../components/based_on';
import { BriefJumpNav } from '../components/brief_jump_nav';
import { SectionTitle } from '../components/section_title';
import {
  BRIEF_RANGE_LABELS,
  EXECUTIVE_BRIEF_SECTION_IDS,
  EXECUTIVE_BRIEF_TEST_IDS,
} from '../constants';
import { useBrief } from '../hooks/use_brief';
import { useBriefConnectors } from '../hooks/use_brief_connectors';
import { useGenerateBrief } from '../hooks/use_generate_brief';
import { ThreatOpenRequestProvider } from './threat_open_request';
import { useBriefFlyoutActions } from './use_brief_flyout_actions';

const FLYOUT_TITLE = 'Executive brief';
const AI_BADGE_LABEL = 'AI';
const MODEL_LABEL = 'Model';
const MODEL_ARIA_LABEL = 'Model used to write the brief';
const GENERATE_LABEL = 'Generate brief';
const REGENERATE_LABEL = 'Regenerate';

const START_TITLE = 'Generate an executive brief';
const START_BODY =
  'An AI-written summary of the priority threats and recommended actions, with the evidence behind them.';
const NO_CONNECTOR_BODY =
  'An AI connector is needed to write the brief. Add one in Stack Management, then come back.';

const LOADING_TITLE = 'Generating the executive brief';
const LOADING_BRIEF_TITLE = 'Loading the executive brief';
const STAGE_LABELS: Record<BriefJobStage, string> = {
  gather: 'Gathering evidence…',
  compose: 'Writing the brief…',
  verify: 'Checking the brief…',
};
const PENDING_STAGE_LABEL = 'Starting…';

const GENERATING_CALLOUT_TITLE = 'Generating a new brief…';
const GENERATING_CALLOUT_BODY = 'The previous brief stays here until the new one is ready.';
const ERROR_TITLE = 'The brief could not be generated';
const LOAD_ERROR_TITLE = 'The brief could not be loaded';
const TRY_AGAIN_LABEL = 'Try again';
const UNKNOWN_ERROR = 'Something went wrong.';

const SECTION_SUBTITLES = {
  atAGlance: 'Overall attention needed, based on active threats and the response to them',
  threats: 'Related activity linked across users and hosts, ranked by severity and response status',
  actions: 'What to do next, grouped by urgency',
} as const;

export interface ExecutiveBriefFlyoutProps {
  /** Page time range; used when generating a brief. */
  timeRange: BriefRange;
  onClose: () => void;
}

const getErrorMessage = (error: Error | undefined): string | undefined => {
  if (!error) return undefined;
  const body = (error as IHttpFetchError<{ message?: string }>).body;
  return body?.message ?? error.message ?? UNKNOWN_ERROR;
};

const formatDateTime = (iso: string): string => new Date(iso).toLocaleString();

interface BriefBodyProps {
  document: BriefResponse;
}

const BriefBody: React.FC<BriefBodyProps> = ({ document }) => {
  const actions = useBriefFlyoutActions();
  const { brief, evidence, params } = document;
  const period = useMemo(
    () =>
      params ? { from: params.from, to: params.to, generatedAt: document.generated_at } : undefined,
    [params, document.generated_at]
  );
  if (!brief || !evidence) return null;

  return (
    <BriefActionsProvider value={actions}>
      <section id={EXECUTIVE_BRIEF_SECTION_IDS.atAGlance}>
        <SectionTitle index={1} title="At a glance" subtitle={SECTION_SUBTITLES.atAGlance} />
        <AtAGlance brief={brief} evidence={evidence} period={period} />
      </section>
      <EuiSpacer size="xl" />
      <section id={EXECUTIVE_BRIEF_SECTION_IDS.threats}>
        <SectionTitle index={2} title="Priority threats" subtitle={SECTION_SUBTITLES.threats} />
        <PriorityThreats brief={brief} evidence={evidence} />
      </section>
      <EuiSpacer size="xl" />
      <section id={EXECUTIVE_BRIEF_SECTION_IDS.actions}>
        <SectionTitle index={3} title="Recommended actions" subtitle={SECTION_SUBTITLES.actions} />
        <RecommendedActions brief={brief} evidence={evidence} />
      </section>
    </BriefActionsProvider>
  );
};

interface LoadingPromptProps {
  title: string;
  body: string;
}

const LoadingPrompt: React.FC<LoadingPromptProps> = ({ title, body }) => (
  <EuiEmptyPrompt
    icon={<EuiLoadingSpinner size="xl" />}
    title={<h3>{title}</h3>}
    body={<p>{body}</p>}
    data-test-subj={EXECUTIVE_BRIEF_TEST_IDS.loading}
  />
);

const ExecutiveBriefFlyoutContent: React.FC<ExecutiveBriefFlyoutProps> = ({
  timeRange,
  onClose,
}) => {
  const titleId = useGeneratedHtmlId({ prefix: 'executiveBriefFlyoutTitle' });
  const {
    connectors,
    isLoading: isLoadingConnectors,
    selectedId,
    setSelectedId,
    getConnectorName,
  } = useBriefConnectors();
  const {
    document,
    isLoading: isLoadingBrief,
    isGenerating,
    error: loadError,
    refetch,
  } = useBrief();
  const { generate, isStarting, error: generateError } = useGenerateBrief();

  const job = document?.job;
  const brief = document?.brief;
  const evidence = document?.evidence;
  const hasBrief = Boolean(brief && evidence);
  const isActive = isGenerating || isStarting;
  const hasConnector = selectedId !== undefined;

  const failureMessage = isActive
    ? undefined
    : getErrorMessage(generateError) ??
      (job?.status === 'failed' ? job.error?.message ?? UNKNOWN_ERROR : undefined);
  const loadErrorMessage = !document ? getErrorMessage(loadError) : undefined;

  const regenerate = () => generate({ range: timeRange, connectorId: selectedId });

  const connectorOptions = useMemo(
    () =>
      connectors.map(({ id, name }) => ({
        value: id,
        inputDisplay: name,
        'data-test-subj': `executiveBriefConnectorOption-${id}`,
      })),
    [connectors]
  );

  const modelName =
    document?.model ?? getConnectorName(document?.params?.connector_id) ?? undefined;
  const metaLine = [
    document?.generated_at ? `Generated ${formatDateTime(document.generated_at)}` : undefined,
    document?.params ? BRIEF_RANGE_LABELS[document.params.range] : undefined,
    modelName,
  ]
    .filter(Boolean)
    .join(' · ');

  const showStart = !document && !isActive && !isLoadingBrief && !loadErrorMessage;
  const showInitialLoading = isLoadingBrief && !document;
  const showGeneratingPrompt = isActive && !hasBrief;

  return (
    <EuiFlyout
      size="l"
      session="start"
      historyKey={documentFlyoutHistoryKey}
      onClose={onClose}
      ownFocus={false}
      paddingSize="l"
      aria-labelledby={titleId}
      flyoutMenuProps={{ title: FLYOUT_TITLE }}
      data-test-subj={EXECUTIVE_BRIEF_TEST_IDS.flyout}
    >
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup
          gutterSize="m"
          alignItems="center"
          justifyContent="spaceBetween"
          responsive={false}
          wrap
        >
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiTitle size="m">
                  <h2 id={titleId}>{FLYOUT_TITLE}</h2>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow" iconType="sparkles">
                  {AI_BADGE_LABEL}
                </EuiBadge>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          {connectors.length > 0 ? (
            <EuiFlexItem grow={false} css={{ width: 300 }}>
              <EuiSuperSelect
                compressed
                fullWidth
                options={connectorOptions}
                valueOfSelected={selectedId}
                onChange={setSelectedId}
                isLoading={isLoadingConnectors}
                disabled={isActive}
                aria-label={MODEL_ARIA_LABEL}
                prepend={MODEL_LABEL}
                data-test-subj={EXECUTIVE_BRIEF_TEST_IDS.connectorPicker}
              />
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
        {hasBrief && evidence ? (
          <>
            <EuiSpacer size="s" />
            <EuiText size="xs" color="subdued" data-test-subj={EXECUTIVE_BRIEF_TEST_IDS.meta}>
              {metaLine}
            </EuiText>
            <EuiSpacer size="m" />
            <BasedOn signals={evidence.signals} />
            <EuiSpacer size="m" />
            <BriefJumpNav
              items={[
                { id: EXECUTIVE_BRIEF_SECTION_IDS.atAGlance, label: 'At a glance' },
                {
                  id: EXECUTIVE_BRIEF_SECTION_IDS.threats,
                  label: 'Priority threats',
                  count: brief?.threats.length ?? 0,
                },
                {
                  id: EXECUTIVE_BRIEF_SECTION_IDS.actions,
                  label: 'Recommended actions',
                  count: brief?.actions.length ?? 0,
                },
              ]}
            />
          </>
        ) : null}
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {showInitialLoading ? <LoadingPrompt title={LOADING_BRIEF_TITLE} body="Loading…" /> : null}
        {loadErrorMessage ? (
          <KbnDangerCallout
            title={LOAD_ERROR_TITLE}
            announceOnMount
            data-test-subj={EXECUTIVE_BRIEF_TEST_IDS.error}
            actionProps={{ primary: { children: TRY_AGAIN_LABEL, onClick: refetch } }}
          >
            {loadErrorMessage}
          </KbnDangerCallout>
        ) : null}
        {showStart ? (
          <EuiEmptyPrompt
            icon={<AiIcon iconType="sparkles" size="xxl" aria-hidden={true} />}
            title={<h3>{START_TITLE}</h3>}
            body={<p>{hasConnector || isLoadingConnectors ? START_BODY : NO_CONNECTOR_BODY}</p>}
            actions={
              <AiButton
                iconType="sparkles"
                onClick={regenerate}
                isDisabled={!hasConnector}
                data-test-subj={EXECUTIVE_BRIEF_TEST_IDS.generate}
              >
                {GENERATE_LABEL}
              </AiButton>
            }
            data-test-subj={EXECUTIVE_BRIEF_TEST_IDS.startPanel}
          />
        ) : null}
        {failureMessage ? (
          <>
            <KbnDangerCallout
              title={ERROR_TITLE}
              announceOnMount
              data-test-subj={EXECUTIVE_BRIEF_TEST_IDS.error}
              actionProps={{
                primary: { children: REGENERATE_LABEL, onClick: regenerate },
              }}
            >
              {failureMessage}
            </KbnDangerCallout>
            {hasBrief ? <EuiSpacer size="l" /> : null}
          </>
        ) : null}
        {showGeneratingPrompt ? (
          <LoadingPrompt
            title={LOADING_TITLE}
            body={job?.stage ? STAGE_LABELS[job.stage] : PENDING_STAGE_LABEL}
          />
        ) : null}
        {isActive && hasBrief ? (
          <>
            <KbnInfoCallout
              title={GENERATING_CALLOUT_TITLE}
              data-test-subj={EXECUTIVE_BRIEF_TEST_IDS.generatingCallout}
            >
              {job?.stage
                ? `${STAGE_LABELS[job.stage]} ${GENERATING_CALLOUT_BODY}`
                : GENERATING_CALLOUT_BODY}
            </KbnInfoCallout>
            <EuiSpacer size="l" />
          </>
        ) : null}
        {document && hasBrief ? <BriefBody document={document} /> : null}
      </EuiFlyoutBody>
      {document || isActive ? (
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="flexEnd" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButton
                iconType="refresh"
                isLoading={isActive}
                isDisabled={isActive || !hasConnector}
                onClick={regenerate}
                data-test-subj={EXECUTIVE_BRIEF_TEST_IDS.regenerate}
              >
                {REGENERATE_LABEL}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      ) : null}
    </EuiFlyout>
  );
};

/** Managed flyout for the executive brief: start, loading, brief and error states. */
export const ExecutiveBriefFlyout: React.FC<ExecutiveBriefFlyoutProps> = (props) => (
  <ThreatOpenRequestProvider>
    <ExecutiveBriefFlyoutContent {...props} />
  </ThreatOpenRequestProvider>
);
