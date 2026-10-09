/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiCopy,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiSuperSelect,
  EuiText,
  EuiThemeProvider,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { KbnDangerCallout } from '@kbn/ui-callout';
import { AiButton, AiIcon } from '@kbn/shared-ux-ai-components';
import type {
  BriefTimeRangeKey,
  ExecutiveBriefJob,
} from '../../../../common/entity_analytics/executive_brief/types';
import { documentFlyoutHistoryKey } from '../../../flyout_v2/shared/constants/flyout_history';
import { SectionErrorBoundary } from './components/section_error_boundary';
import { BasedOn } from './components/based_on';
import { BriefJumpNav } from './components/brief_jump_nav';
import { BriefLoading } from './components/brief_loading';
import { BriefContextProvider } from './components/brief_context';
import {
  BRIEF_BLOCK_ATTRIBUTE,
  BRIEF_PRINT_MODE_ATTRIBUTE,
  EXECUTIVE_BRIEF_BODY_ID,
  EXECUTIVE_BRIEF_SECTION_IDS,
} from './constants';
import { TEMPLATE_OPTION_ID, useBriefConnectors } from './hooks/use_brief_connectors';
import { useExecutiveBrief } from './hooks/use_executive_brief';
import { AtAGlance } from './sections/at_a_glance';
import { BlindSpots } from './sections/blind_spots';
import { DebugPanel } from './sections/debug_panel';
import { USAGE_TEST_IDS, getUsageLine } from './sections/debug_panel_usage';
import { Decisions } from './sections/decisions';
import { Details } from './sections/details';
import { Storylines } from './sections/storylines';
import { TEST_IDS } from './test_ids';
import { briefToMarkdown } from './utils/brief_to_markdown';

const TIME_RANGE_LABEL: Record<BriefTimeRangeKey, string> = {
  '24h': 'Last 24 hours',
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
};

const formatDateTime = (iso: string): string => new Date(iso).toLocaleString();

export interface ExecutiveBriefFlyoutProps {
  /** Page time range (24h | 7d | 30d). */
  timeRange: BriefTimeRangeKey;
  onClose: () => void;
  /** Wired by the PDF export hook; the button is disabled until provided. */
  onExportPdf?: (
    job: ExecutiveBriefJob,
    onProgress?: (done: number, total: number) => void
  ) => void | Promise<void>;
}

/** Waits for React to apply print mode (and EuiAccordion to open) before the capture starts. */
const waitForPrintRender = (): Promise<void> =>
  new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve, 800)));
  });

interface PrintSurfaceProps {
  isPrintMode: boolean;
}

/**
 * Wraps the brief body. In print mode it forces the light colour scheme and a plain background,
 * and hides the graph-view buttons through this component's own `data-print-mode` attribute.
 */
const PrintSurfaceContent: React.FC<React.PropsWithChildren<PrintSurfaceProps>> = ({
  isPrintMode,
  children,
}) => {
  const { euiTheme } = useEuiTheme();
  const printStyles = css`
    background-color: ${euiTheme.colors.backgroundBasePlain};
    &[${BRIEF_PRINT_MODE_ATTRIBUTE}='true'] [data-test-subj='executiveBriefOpenGraph'] {
      display: none;
    }
  `;
  return (
    <div
      id={EXECUTIVE_BRIEF_BODY_ID}
      css={isPrintMode ? printStyles : undefined}
      {...{ [BRIEF_PRINT_MODE_ATTRIBUTE]: isPrintMode ? 'true' : 'false' }}
    >
      {children}
    </div>
  );
};

const PrintSurface: React.FC<React.PropsWithChildren<PrintSurfaceProps>> = ({
  isPrintMode,
  children,
}) => {
  // The light theme only wraps the content while printing, so normal rendering is untouched.
  if (!isPrintMode) {
    return <PrintSurfaceContent isPrintMode={false}>{children}</PrintSurfaceContent>;
  }
  return (
    <EuiThemeProvider colorMode="light">
      <PrintSurfaceContent isPrintMode>{children}</PrintSurfaceContent>
    </EuiThemeProvider>
  );
};

export const ExecutiveBriefFlyout: React.FC<ExecutiveBriefFlyoutProps> = ({
  timeRange,
  onClose,
  onExportPdf,
}) => {
  const titleId = useGeneratedHtmlId({ prefix: 'executiveBriefFlyoutTitle' });
  const {
    connectors,
    isLoading: isLoadingConnectors,
    selectedId,
    setSelectedId,
    selection,
    getConnectorName,
  } = useBriefConnectors();
  const { job, hasRequested, isGenerating, requestError, mode, regenerate } = useExecutiveBrief(
    timeRange,
    selection
  );
  const [isPrintMode, setIsPrintMode] = useState(false);
  const [exportProgress, setExportProgress] = useState<{ done: number; total: number }>();

  const succeeded = job?.status === 'succeeded' && job.snapshot && job.brief ? job : undefined;
  const failureMessage =
    job?.status === 'failed' || job?.status === 'canceled'
      ? job.error?.message ?? `The brief ${job.status}`
      : requestError?.message;
  const hasFailed = Boolean(failureMessage) && !succeeded;

  const modelLabel = useMemo(() => {
    if (!succeeded) return undefined;
    if (succeeded.params.generator !== 'inference') return 'Template generator';
    return succeeded.model ?? getConnectorName(succeeded.params.connectorId) ?? 'AI generator';
  }, [succeeded, getConnectorName]);

  // The picker already shows the selected model; only name the generator when it differs (or in print).
  const showGeneratedModel =
    Boolean(modelLabel) && (isPrintMode || modelLabel !== getConnectorName(selectedId));

  const usageLine = !isPrintMode && succeeded ? getUsageLine(succeeded, modelLabel) : undefined;

  const connectorOptions = useMemo(
    () => [
      ...connectors.map(({ id, name }) => ({
        value: id,
        inputDisplay: name,
        'data-test-subj': `executiveBriefConnectorOption-${id}`,
      })),
      {
        value: TEMPLATE_OPTION_ID,
        inputDisplay: 'Template (no AI)',
        'data-test-subj': 'executiveBriefConnectorOption-template',
      },
    ],
    [connectors]
  );

  const exportPdf = useCallback(async () => {
    if (!succeeded || !onExportPdf) return;
    setIsPrintMode(true);
    try {
      await waitForPrintRender();
      setExportProgress({ done: 0, total: 0 });
      await onExportPdf(succeeded, (done, total) => setExportProgress({ done, total }));
    } finally {
      setExportProgress(undefined);
      setIsPrintMode(false);
    }
  }, [onExportPdf, succeeded]);

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
      <EuiFlyoutHeader
        hasBorder
        id={EXECUTIVE_BRIEF_SECTION_IDS.header}
        {...{ [BRIEF_BLOCK_ATTRIBUTE]: 'header' }}
      >
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
                  <h2 id={titleId}>{'Executive brief'}</h2>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow" iconType="sparkles">
                  {'AI'}
                </EuiBadge>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          {!isPrintMode && (
            <EuiFlexItem grow={false} css={{ width: 300 }}>
              <EuiSuperSelect
                compressed
                fullWidth
                options={connectorOptions}
                valueOfSelected={selectedId}
                onChange={setSelectedId}
                isLoading={isLoadingConnectors}
                disabled={isGenerating}
                aria-label="Model used to write the brief"
                prepend="Model"
                data-test-subj="executiveBriefConnectorPicker"
              />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <EuiText size="xs" color="subdued" data-test-subj="executiveBriefMeta">
          {succeeded?.snapshot
            ? `Generated ${formatDateTime(succeeded.snapshot.generatedAt)}${
                showGeneratedModel ? ` with ${modelLabel}` : ''
              } · ${TIME_RANGE_LABEL[succeeded.snapshot.timeRange.range]}`
            : TIME_RANGE_LABEL[timeRange]}
        </EuiText>
        {succeeded?.snapshot && (
          <>
            <EuiSpacer size="m" />
            <BasedOn snapshot={succeeded.snapshot} />
          </>
        )}
        {succeeded?.snapshot && succeeded.brief && !isPrintMode && (
          <>
            <EuiSpacer size="m" />
            <BriefJumpNav
              items={[
                { id: EXECUTIVE_BRIEF_SECTION_IDS.atAGlance, label: 'At a glance' },
                {
                  id: EXECUTIVE_BRIEF_SECTION_IDS.storylines,
                  label: 'Priority threats',
                  count: succeeded.brief.storylines.length,
                },
                {
                  id: EXECUTIVE_BRIEF_SECTION_IDS.blindSpots,
                  label: 'Blind spots',
                  count: succeeded.snapshot.blindSpots.gaps.length,
                },
                {
                  id: EXECUTIVE_BRIEF_SECTION_IDS.decisions,
                  label: 'Decisions',
                  count: succeeded.brief.decisions.length,
                },
                { id: EXECUTIVE_BRIEF_SECTION_IDS.details, label: 'Details' },
              ]}
            />
          </>
        )}
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <PrintSurface isPrintMode={isPrintMode}>
          {!hasRequested && !succeeded && (
            <EuiEmptyPrompt
              icon={<AiIcon iconType="sparkles" size="xxl" aria-hidden={true} />}
              title={<h3>{'Generate an executive brief'}</h3>}
              body={
                <p>
                  {`Priority threats, blind spots and recommended decisions for the ${TIME_RANGE_LABEL[
                    timeRange
                  ].toLowerCase()}. `}
                  {selection.generator === 'inference'
                    ? 'Takes about 30 seconds.'
                    : 'Uses the template generator (no AI); takes a few seconds.'}
                </p>
              }
              actions={
                <AiButton
                  iconType="sparkles"
                  onClick={() => regenerate()}
                  isDisabled={!selection.isReady}
                  data-test-subj={TEST_IDS.generate}
                >
                  {'Generate brief'}
                </AiButton>
              }
              data-test-subj={TEST_IDS.startPanel}
            />
          )}
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
          {!hasFailed && !succeeded && isGenerating && <BriefLoading job={job} />}
          {succeeded?.snapshot && succeeded.brief && (
            <BriefContextProvider
              snapshot={succeeded.snapshot}
              flags={succeeded.validation?.flags}
              isPrintMode={isPrintMode}
            >
              <SectionErrorBoundary fallbackText="AtAGlance could not be displayed">
                <AtAGlance
                  snapshot={succeeded.snapshot}
                  glance={succeeded.brief.glance}
                  brief={succeeded.brief}
                />
              </SectionErrorBoundary>
              <EuiSpacer size="xl" />
              <SectionErrorBoundary fallbackText="Priority threats could not be displayed">
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
              {!isPrintMode && (
                <>
                  <EuiSpacer size="m" />
                  <DebugPanel
                    job={succeeded}
                    mode={mode}
                    onModeChange={(next) => regenerate(next)}
                  />
                </>
              )}
            </BriefContextProvider>
          )}
        </PrintSurface>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiCopy textToCopy={markdown}>
                  {(copy) => (
                    <EuiButtonEmpty
                      iconType="copy"
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
                  isDisabled={!succeeded || !onExportPdf || isPrintMode}
                  isLoading={isPrintMode}
                  onClick={exportPdf}
                  data-test-subj={TEST_IDS.exportPdf}
                >
                  {exportProgress
                    ? `Exporting PDF… ${exportProgress.done}/${exportProgress.total}`
                    : 'Export PDF'}
                </EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          {usageLine && (
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued" data-test-subj={USAGE_TEST_IDS.footerLine}>
                {usageLine}
              </EuiText>
            </EuiFlexItem>
          )}
          {hasRequested && (
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
          )}
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
