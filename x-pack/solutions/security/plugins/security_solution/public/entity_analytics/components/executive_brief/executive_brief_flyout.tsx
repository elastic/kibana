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
  EuiButtonEmpty,
  EuiCopy,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiProgress,
  EuiSkeletonText,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { KbnDangerCallout } from '@kbn/ui-callout';
import type {
  BriefJobStage,
  BriefSnapshot,
  BriefTimeRangeKey,
  ExecutiveBriefJob,
} from '../../../../common/entity_analytics/executive_brief/types';
import { documentFlyoutHistoryKey } from '../../../flyout_v2/shared/constants/flyout_history';
import { SectionErrorBoundary } from './components/section_error_boundary';
import { BriefContextProvider } from './components/brief_context';
import { EXECUTIVE_BRIEF_BODY_ID, EXECUTIVE_BRIEF_SECTION_IDS } from './constants';
import { useExecutiveBrief } from './hooks/use_executive_brief';
import { AtAGlance } from './sections/at_a_glance';
import { BlindSpots } from './sections/blind_spots';
import { DebugPanel } from './sections/debug_panel';
import { Decisions } from './sections/decisions';
import { Details } from './sections/details';
import { Storylines } from './sections/storylines';
import { TEST_IDS } from './test_ids';
import { briefToMarkdown } from './utils/brief_to_markdown';

const STAGE_LABEL: Record<BriefJobStage, string> = {
  snapshot: 'Collecting entity, alert and detection data',
  storylines: 'Connecting entities into storylines',
  blind_spots: 'Checking attack-stage coverage and visibility gaps',
  generate: 'Writing the brief',
  validate: 'Checking every claim against the evidence',
  persist: 'Saving the brief',
};

const TIME_RANGE_LABEL: Record<BriefTimeRangeKey, string> = {
  '24h': 'Last 24 hours',
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
};

const formatDateTime = (iso: string): string => new Date(iso).toLocaleString();

const countByKind = (snapshot: BriefSnapshot, kind: string): number =>
  Object.values(snapshot.catalog).filter((entry) => entry.kind === kind).length;

const BasedOn: React.FC<{ snapshot: BriefSnapshot }> = ({ snapshot }) => {
  const entityTypes = new Set(Object.values(snapshot.entities).map(({ type }) => type));
  const badges = [
    `${Object.keys(snapshot.entities).length} entities`,
    `${entityTypes.size} entity types`,
    `${countByKind(snapshot, 'rule')} rules`,
    `${countByKind(snapshot, 'attack_discovery')} attack discoveries`,
    `${countByKind(snapshot, 'lead')} hunting leads`,
    `${countByKind(snapshot, 'anomaly')} anomaly groups`,
  ];
  return (
    <EuiFlexGroup gutterSize="xs" wrap responsive={false} data-test-subj={TEST_IDS.basedOn}>
      <EuiFlexItem grow={false}>
        <EuiText size="xs" color="subdued">
          {'Based on'}
        </EuiText>
      </EuiFlexItem>
      {badges.map((label) => (
        <EuiFlexItem grow={false} key={label}>
          <EuiBadge color="hollow">{label}</EuiBadge>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};

interface ProgressProps {
  job: ExecutiveBriefJob | undefined;
}

const Progress: React.FC<ProgressProps> = ({ job }) => (
  <div data-test-subj={TEST_IDS.progress}>
    <EuiProgress size="xs" color="accent" />
    <EuiSpacer size="m" />
    <EuiText size="s">
      <p>{job?.stage ? STAGE_LABEL[job.stage] : 'Starting the brief'}</p>
    </EuiText>
    <EuiSpacer size="m" />
    <EuiSkeletonText lines={4} />
    <EuiSpacer size="l" />
    <EuiSkeletonText lines={8} />
  </div>
);

export interface ExecutiveBriefFlyoutProps {
  /** Page time range (24h | 7d | 30d). */
  timeRange: BriefTimeRangeKey;
  onClose: () => void;
  /** Wired by the PDF export lane; the button is disabled until provided. */
  onExportPdf?: (job: ExecutiveBriefJob) => void;
}

export const ExecutiveBriefFlyout: React.FC<ExecutiveBriefFlyoutProps> = ({
  timeRange,
  onClose,
  onExportPdf,
}) => {
  const titleId = useGeneratedHtmlId({ prefix: 'executiveBriefFlyoutTitle' });
  const { job, isGenerating, requestError, mode, regenerate } = useExecutiveBrief(timeRange);

  const succeeded = job?.status === 'succeeded' && job.snapshot && job.brief ? job : undefined;
  const failureMessage =
    job?.status === 'failed' || job?.status === 'canceled'
      ? job.error?.message ?? `The brief ${job.status}`
      : requestError?.message;
  const hasFailed = Boolean(failureMessage) && !succeeded;

  const markdown = useMemo(() => (succeeded ? briefToMarkdown(succeeded) : ''), [succeeded]);

  return (
    <EuiFlyout
      size="l"
      session="start"
      historyKey={documentFlyoutHistoryKey}
      onClose={onClose}
      ownFocus={false}
      paddingSize="l"
      aria-labelledby={titleId}
      flyoutMenuProps={{ title: 'Executive brief' }}
      data-test-subj={TEST_IDS.flyout}
    >
      <EuiFlyoutHeader hasBorder id={EXECUTIVE_BRIEF_SECTION_IDS.header}>
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiTitle size="m">
              <h2 id={titleId}>{'Executive brief'}</h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow" iconType="sparkles">
              {'AI'}
            </EuiBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="xs" />
        <EuiText size="xs" color="subdued" data-test-subj="executiveBriefMeta">
          {succeeded?.snapshot
            ? `Generated ${formatDateTime(succeeded.snapshot.generatedAt)} · ${
                TIME_RANGE_LABEL[succeeded.snapshot.timeRange.range]
              } · ${succeeded.params.generator} generator`
            : TIME_RANGE_LABEL[timeRange]}
        </EuiText>
        {succeeded?.snapshot && (
          <>
            <EuiSpacer size="s" />
            <BasedOn snapshot={succeeded.snapshot} />
          </>
        )}
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <div id={EXECUTIVE_BRIEF_BODY_ID}>
          {hasFailed && (
            <KbnDangerCallout
              title="The brief could not be generated"
              announceOnMount
              data-test-subj={TEST_IDS.error}
              actionProps={{
                primary: { children: 'Regenerate', onClick: () => regenerate() },
              }}
            >
              {failureMessage}
            </KbnDangerCallout>
          )}
          {!hasFailed && !succeeded && isGenerating && <Progress job={job} />}
          {succeeded?.snapshot && succeeded.brief && (
            <BriefContextProvider snapshot={succeeded.snapshot}>
              <SectionErrorBoundary fallbackText="AtAGlance could not be displayed">
                <AtAGlance snapshot={succeeded.snapshot} glance={succeeded.brief.glance} />
              </SectionErrorBoundary>
              <EuiSpacer size="xl" />
              <SectionErrorBoundary fallbackText="Storylines could not be displayed">
                <Storylines snapshot={succeeded.snapshot} brief={succeeded.brief} />
              </SectionErrorBoundary>
              <EuiSpacer size="xl" />
              <SectionErrorBoundary fallbackText="BlindSpots could not be displayed">
                <BlindSpots snapshot={succeeded.snapshot} blindSpots={succeeded.brief.blindSpots} />
              </SectionErrorBoundary>
              <EuiSpacer size="xl" />
              <SectionErrorBoundary fallbackText="Decisions could not be displayed">
                <Decisions decisions={succeeded.brief.decisions} />
              </SectionErrorBoundary>
              <EuiSpacer size="xl" />
              <SectionErrorBoundary fallbackText="Details could not be displayed">
                <Details snapshot={succeeded.snapshot} />
              </SectionErrorBoundary>
              <EuiSpacer size="m" />
              <DebugPanel job={succeeded} mode={mode} onModeChange={(next) => regenerate(next)} />
            </BriefContextProvider>
          )}
        </div>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiCopy textToCopy={markdown}>
                  {(copy) => (
                    <EuiButtonEmpty
                      iconType="copyClipboard"
                      onClick={copy}
                      isDisabled={!succeeded}
                      data-test-subj={TEST_IDS.copyMarkdown}
                    >
                      {'Copy as markdown'}
                    </EuiButtonEmpty>
                  )}
                </EuiCopy>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  iconType="download"
                  isDisabled={!succeeded || !onExportPdf}
                  onClick={() => succeeded && onExportPdf?.(succeeded)}
                  data-test-subj={TEST_IDS.exportPdf}
                >
                  {'Export PDF'}
                </EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              iconType="refresh"
              isLoading={isGenerating}
              isDisabled={isGenerating}
              onClick={() => regenerate()}
              data-test-subj={TEST_IDS.regenerate}
            >
              {'Regenerate'}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
