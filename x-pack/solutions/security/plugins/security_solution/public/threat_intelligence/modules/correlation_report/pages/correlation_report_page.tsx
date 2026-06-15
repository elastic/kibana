/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiBadge,
  EuiBasicTable,
  EuiButton,
  EuiButtonGroup,
  EuiButtonIcon,
  EuiCallOut,
  EuiEmptyPrompt,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiListGroup,
  EuiListGroupItem,
  EuiLoadingSpinner,
  EuiPageTemplate,
  EuiPanel,
  EuiPopover,
  EuiRadioGroup,
  EuiSpacer,
  EuiText,
  EuiTextArea,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import type {
  EuiBasicTableColumn,
  EuiButtonGroupOptionProps,
  EuiRadioGroupOption,
} from '@elastic/eui';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { CorrelationReport, DiamondSvg } from '../components/correlation_report';
import { useCorrelationRuns } from '../hooks/use_correlation_findings';
import type { StartRunInput } from '../hooks/use_correlation_findings';
import type {
  CorrelationDepth,
  CorrelationRun,
  ExtractDepthResult,
  FullDepthResult,
  KnnDepthResult,
  TriageDepthResult,
} from '../../../../../common/threat_intelligence/correlation_runs';
import type { CorrelationFindingsLead } from '../../../../../common/threat_intelligence/correlation';
import { i18nText } from '../components/translations';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const INPUT_TYPE_OPTION_REPORT_ID = 'correlation-input-report-id';
const INPUT_TYPE_OPTION_RAW_TEXT = 'correlation-input-raw-text';

const INPUT_TYPE_OPTIONS: EuiButtonGroupOptionProps[] = [
  { id: INPUT_TYPE_OPTION_REPORT_ID, label: i18nText.inputTypeReportId() },
  { id: INPUT_TYPE_OPTION_RAW_TEXT, label: i18nText.inputTypeRawText() },
];

interface DepthOption {
  readonly depth: CorrelationDepth;
  readonly label: string;
  readonly hint: string;
}

const DEPTH_OPTIONS: readonly DepthOption[] = [
  {
    depth: 'full',
    label: i18nText.depthFullLabel(),
    hint: i18nText.depthFullHint(),
  },
  {
    depth: 'triage',
    label: i18nText.depthTriageLabel(),
    hint: i18nText.depthTriageHint(),
  },
  {
    depth: 'knn',
    label: i18nText.depthKnnLabel(),
    hint: i18nText.depthKnnHint(),
  },
  {
    depth: 'extract',
    label: i18nText.depthExtractLabel(),
    hint: i18nText.depthExtractHint(),
  },
];

const STAGE_LABEL_MAP: Readonly<Record<string, () => string>> = {
  extract: i18nText.stageExtract,
  search: i18nText.stageSearch,
  gap_fill: i18nText.stageGapFill,
  dedup: i18nText.stageDedup,
  triage: i18nText.stageTriage,
  synthesize: i18nText.stageSynthesize,
};

const getStageLabel = (stage: string | undefined): string =>
  stage !== undefined && stage in STAGE_LABEL_MAP
    ? STAGE_LABEL_MAP[stage]()
    : i18nText.stagePending();

const STATUS_BADGE_COLOR: Readonly<Record<string, string>> = {
  pending: 'default',
  running: 'primary',
  succeeded: 'success',
  failed: 'danger',
};

const STATUS_LABEL_FNS: Readonly<Record<string, () => string>> = {
  pending: i18nText.statusPending,
  running: i18nText.statusRunning,
  succeeded: i18nText.statusSucceeded,
  failed: i18nText.statusFailed,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type VertexKey = 'adversary' | 'capability' | 'infrastructure' | 'victim';
const VERTEX_KEYS: readonly VertexKey[] = ['adversary', 'capability', 'infrastructure', 'victim'];

const VERTEX_LABEL_FNS: Readonly<Record<VertexKey, () => string>> = {
  adversary: i18nText.vertexAdversary,
  capability: i18nText.vertexCapability,
  infrastructure: i18nText.vertexInfrastructure,
  victim: i18nText.vertexVictim,
};

const normalizeSignal = (s: string): 'high' | 'partial' | 'none' => {
  const lower = s.toLowerCase();
  return lower === 'high' || lower === 'partial' ? lower : 'none';
};

const toVertexSignal = (
  diamond: ExtractDepthResult['diamond']
): CorrelationFindingsLead['vertex_signal'] => ({
  adversary: normalizeSignal(diamond.adversary.signal),
  capability: normalizeSignal(diamond.capability.signal),
  infrastructure: normalizeSignal(diamond.infrastructure.signal),
  victim: normalizeSignal(diamond.victim.signal),
});

// ---------------------------------------------------------------------------
// ExtractResultView
// ---------------------------------------------------------------------------

const ExtractResultView: FC<{ result: ExtractDepthResult }> = ({ result }) => {
  const { euiTheme } = useEuiTheme();
  const vertexSignal = useMemo(() => toVertexSignal(result.diamond), [result.diamond]);

  return (
    <EuiPanel hasBorder paddingSize="m" data-test-subj="correlationExtractResult">
      <EuiTitle size="s">
        <h2>{i18nText.extractResultTitle()}</h2>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiFlexGroup gutterSize="l" alignItems="flexStart" wrap>
        <EuiFlexItem grow={false}>
          <DiamondSvg vertexSignal={vertexSignal} euiColors={euiTheme.colors} size={160} />
        </EuiFlexItem>
        <EuiFlexItem>
          {VERTEX_KEYS.map((v) => (
            <div key={v}>
              <EuiText size="s">
                <strong>{VERTEX_LABEL_FNS[v]()}</strong>
                {' — '}
                <span>{result.diamond[v].signal}</span>
              </EuiText>
              {result.diamond[v].summary ? (
                <EuiText size="xs" color="subdued">
                  {result.diamond[v].summary}
                </EuiText>
              ) : null}
              <EuiSpacer size="s" />
            </div>
          ))}
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};

// ---------------------------------------------------------------------------
// KnnResultView
// ---------------------------------------------------------------------------

type MergedCandidate = KnnDepthResult['merged'][number];
type AnchorHit = KnnDepthResult['anchor_hits'][number];

const KnnResultView: FC<{ result: KnnDepthResult }> = ({ result }) => {
  const mergedColumns: Array<EuiBasicTableColumn<MergedCandidate>> = useMemo(
    () => [
      {
        field: 'title',
        name: i18nText.knnColTitle(),
        truncateText: true,
      },
      {
        field: 'overlap',
        name: i18nText.knnColOverlap(),
        width: '80px',
        render: (value: MergedCandidate['overlap']) => value.toFixed(2),
      },
      {
        field: 'score',
        name: i18nText.knnColScore(),
        width: '80px',
        render: (value: MergedCandidate['score']) => value.toFixed(3),
      },
      {
        name: i18nText.knnColVertexScores(),
        render: (_: unknown, item: MergedCandidate) => (
          <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
            {Object.entries(item.vertex_scores).map(([k, v]) => (
              <EuiFlexItem key={k} grow={false}>
                <EuiBadge color="hollow">
                  {`${k.slice(0, 3).toUpperCase()}: ${v.toFixed(2)}`}
                </EuiBadge>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        ),
      },
    ],
    []
  );

  return (
    <EuiPanel hasBorder paddingSize="m" data-test-subj="correlationKnnResult">
      <EuiTitle size="s">
        <h2>{i18nText.knnResultTitle()}</h2>
      </EuiTitle>
      <EuiSpacer size="m" />

      <EuiTitle size="xs">
        <h3>{i18nText.knnMergedTitle()}</h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      {result.merged.length === 0 ? (
        <EuiText size="s" color="subdued">
          {i18nText.knnNoMerged()}
        </EuiText>
      ) : (
        <EuiBasicTable<MergedCandidate>
          items={result.merged}
          columns={mergedColumns}
          rowProps={(item: MergedCandidate) => ({
            'data-test-subj': `knnMergedRow-${item.report_id}`,
          })}
        />
      )}

      {result.anchor_hits.length > 0 ? (
        <>
          <EuiSpacer size="m" />
          <EuiTitle size="xs">
            <h3>{i18nText.knnAnchorHitsTitle()}</h3>
          </EuiTitle>
          <EuiSpacer size="s" />
          {result.anchor_hits.map((hit: AnchorHit) => (
            <EuiText key={hit.report_id} size="s">
              {hit.title}
            </EuiText>
          ))}
        </>
      ) : null}
    </EuiPanel>
  );
};

// ---------------------------------------------------------------------------
// TriageResultView
// ---------------------------------------------------------------------------

type TriagePick = TriageDepthResult['picks'][number];

const TriageResultView: FC<{ result: TriageDepthResult }> = ({ result }) => {
  const picksColumns: Array<EuiBasicTableColumn<TriagePick>> = useMemo(
    () => [
      {
        field: 'candidate_id',
        name: i18nText.triageColCandidate(),
        truncateText: true,
      },
      {
        field: 'confidence',
        name: i18nText.triageColConfidence(),
        width: '100px',
        render: (value: TriagePick['confidence']) => `${(value * 100).toFixed(0)}%`,
      },
      {
        field: 'justification',
        name: i18nText.triageColJustification(),
      },
    ],
    []
  );

  return (
    <EuiPanel hasBorder paddingSize="m" data-test-subj="correlationTriageResult">
      <EuiTitle size="s">
        <h2>{i18nText.triageResultTitle()}</h2>
      </EuiTitle>
      <EuiSpacer size="m" />

      <EuiFlexGroup gutterSize="l" wrap>
        <EuiFlexItem grow={false}>
          <EuiText size="s">
            <strong>
              {i18nText.triageCandidatesFed()}
              {': '}
            </strong>
            {result.candidates_fed}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="s">
            <strong>
              {i18nText.triageFallbackUsed()}
              {': '}
            </strong>
            {result.fallback_used ? i18nText.triageYes() : i18nText.triageNo()}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      <EuiTitle size="xs">
        <h3>{i18nText.triagePicksTitle()}</h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      {result.picks.length === 0 ? (
        <EuiText size="s" color="subdued">
          {i18nText.triageNoPicks()}
        </EuiText>
      ) : (
        <EuiBasicTable<TriagePick>
          items={result.picks}
          columns={picksColumns}
          rowProps={(item: TriagePick) => ({
            'data-test-subj': `triagePickRow-${item.candidate_id}`,
          })}
        />
      )}

      {result.groups.length > 0 ? (
        <>
          <EuiSpacer size="m" />
          <EuiTitle size="xs">
            <h3>{i18nText.triageGroupsTitle()}</h3>
          </EuiTitle>
          <EuiSpacer size="s" />
          {result.groups.map((group, idx) => (
            <EuiPanel key={idx} hasBorder paddingSize="s" data-test-subj={`triageGroup-${idx}`}>
              <EuiText size="s">
                <strong>
                  {i18nText.triageGroupHypothesis()}
                  {': '}
                </strong>
                {group.hypothesis}
              </EuiText>
              <EuiSpacer size="xs" />
              {group.candidates.map((c) => (
                <EuiText key={c.candidate_id} size="xs" color="subdued">
                  {`${c.candidate_id} — ${(c.confidence * 100).toFixed(0)}%`}
                </EuiText>
              ))}
            </EuiPanel>
          ))}
        </>
      ) : null}
    </EuiPanel>
  );
};

// ---------------------------------------------------------------------------
// ResultDispatch — routes to the correct result view by depth
// ---------------------------------------------------------------------------

const ResultDispatch: FC<{
  run: CorrelationRun;
}> = ({ run }) => {
  const { result } = run;
  if (result === undefined) return null;

  if (result.depth === 'full') {
    const fullResult = result as FullDepthResult;
    return (
      <CorrelationReport
        findings={fullResult.findings}
        candidateMeta={fullResult.findings.candidate_meta}
        title={run.input_summary ?? run.runId}
        runId={run.runId}
      />
    );
  }

  if (result.depth === 'extract') {
    return <ExtractResultView result={result as ExtractDepthResult} />;
  }

  if (result.depth === 'knn') {
    return <KnnResultView result={result as KnnDepthResult} />;
  }

  if (result.depth === 'triage') {
    return <TriageResultView result={result as TriageDepthResult} />;
  }

  return null;
};

// ---------------------------------------------------------------------------
// RecentsPanel
// ---------------------------------------------------------------------------

const RecentsPanel: FC<{
  recents: readonly CorrelationRun[];
  loading: boolean;
  activeRunId: string | undefined;
  onLoadRun: (runId: string) => void;
}> = ({ recents, loading, activeRunId, onLoadRun }) => {
  const sorted = useMemo(
    () => [...recents].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [recents]
  );

  return (
    <EuiPanel hasBorder paddingSize="m" data-test-subj="correlationReportRecents">
      <EuiTitle size="s">
        <h2>{i18nText.recentsTitle()}</h2>
      </EuiTitle>
      <EuiSpacer size="s" />
      {loading ? (
        <EuiLoadingSpinner size="s" />
      ) : sorted.length === 0 ? (
        <EuiText size="s" color="subdued">
          {i18nText.recentsEmpty()}
        </EuiText>
      ) : (
        <EuiListGroup flush bordered maxWidth={false} gutterSize="none">
          {sorted.map((run) => (
            <EuiListGroupItem
              key={run.runId}
              size="s"
              isActive={run.runId === activeRunId}
              wrapText
              onClick={() => onLoadRun(run.runId)}
              data-test-subj={`correlationRecentRun-${run.runId}`}
              label={
                <EuiFlexGroup
                  gutterSize="s"
                  alignItems="center"
                  justifyContent="spaceBetween"
                  responsive={false}
                  wrap
                >
                  <EuiFlexItem>
                    <EuiText size="xs">{run.input_summary ?? run.runId.slice(0, 16)}</EuiText>
                    <EuiText size="xs" color="subdued">
                      {new Date(run.createdAt).toLocaleString()}
                    </EuiText>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiFlexGroup gutterSize="xs" responsive={false} alignItems="center">
                      <EuiFlexItem grow={false}>
                        <EuiBadge color="hollow">{run.depth}</EuiBadge>
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiBadge color={STATUS_BADGE_COLOR[run.status] ?? 'default'}>
                          {STATUS_LABEL_FNS[run.status]?.() ?? run.status}
                        </EuiBadge>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiFlexItem>
                </EuiFlexGroup>
              }
            />
          ))}
        </EuiListGroup>
      )}
    </EuiPanel>
  );
};

// ---------------------------------------------------------------------------
// CorrelationReportPage
// ---------------------------------------------------------------------------

export const CorrelationReportPage: FC = () => {
  const skillEnabled = useIsExperimentalFeatureEnabled('threatIntelligenceSkillEnabled');

  const [inputTypeOptionId, setInputTypeOptionId] = useState(INPUT_TYPE_OPTION_REPORT_ID);
  const [reportId, setReportId] = useState('');
  const [rawText, setRawText] = useState('');
  const [depth, setDepth] = useState<CorrelationDepth>('full');
  const [depthPopoverOpen, setDepthPopoverOpen] = useState(false);

  const lastInputRef = useRef<StartRunInput | null>(null);

  const { activeRun, polling, error, recents, recentsLoading, startRun, loadRun, refreshRecents } =
    useCorrelationRuns();

  const inputType = inputTypeOptionId === INPUT_TYPE_OPTION_REPORT_ID ? 'report_id' : 'raw_text';

  const isInputValid =
    inputType === 'report_id' ? reportId.trim().length > 0 : rawText.trim().length > 0;

  const depthRadioOptions: EuiRadioGroupOption[] = useMemo(
    () =>
      DEPTH_OPTIONS.map(({ depth: d, label, hint }) => ({
        id: d,
        label: (
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem>{label}</EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                {hint}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
      })),
    []
  );

  const handleRun = useCallback(() => {
    const input: StartRunInput =
      inputType === 'report_id'
        ? { input_type: 'report_id', report_id: reportId.trim(), depth }
        : { input_type: 'raw_text', raw_text: rawText.trim(), depth };
    lastInputRef.current = input;
    void startRun(input);
  }, [depth, inputType, rawText, reportId, startRun]);

  const handleRetry = useCallback(() => {
    if (lastInputRef.current) {
      void startRun(lastInputRef.current);
    }
  }, [startRun]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && isInputValid && !polling) handleRun();
    },
    [handleRun, isInputValid, polling]
  );

  const handleLoadRun = useCallback(
    (runId: string) => {
      void loadRun(runId);
    },
    [loadRun]
  );

  // Refresh recents when a run completes
  const prevStatusRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (activeRun?.status === 'succeeded' && prevStatusRef.current !== 'succeeded') {
      void refreshRecents();
    }
    prevStatusRef.current = activeRun?.status;
  }, [activeRun?.status, refreshRecents]);

  const stageLabel = getStageLabel(activeRun?.stage);

  if (!skillEnabled) {
    return (
      <EuiPageTemplate restrictWidth={false} grow>
        <EuiPageTemplate.Header
          pageTitle={i18n.translate(
            'xpack.securitySolution.threatIntelligence.correlationReport.pageTitle',
            { defaultMessage: 'Correlation Report' }
          )}
        />
        <EuiPageTemplate.Section>
          <EuiCallOut
            title={i18n.translate(
              'xpack.securitySolution.threatIntelligence.correlationReport.featureDisabledTitle',
              { defaultMessage: 'Feature not enabled' }
            )}
            color="warning"
            iconType="lock"
            data-test-subj="correlationReportFeatureDisabled"
          >
            <EuiText size="s">
              {i18n.translate(
                'xpack.securitySolution.threatIntelligence.correlationReport.featureDisabledBody',
                {
                  defaultMessage:
                    'The Threat Intelligence Skill feature must be enabled to use this page. Add `threatIntelligenceSkillEnabled` to `xpack.securitySolution.enableExperimental` in your Kibana configuration.',
                }
              )}
            </EuiText>
          </EuiCallOut>
        </EuiPageTemplate.Section>
      </EuiPageTemplate>
    );
  }

  return (
    <EuiPageTemplate restrictWidth={false} grow>
      <EuiPageTemplate.Header
        pageTitle={i18n.translate(
          'xpack.securitySolution.threatIntelligence.correlationReport.pageTitle',
          { defaultMessage: 'Correlation Report' }
        )}
        description={i18n.translate(
          'xpack.securitySolution.threatIntelligence.correlationReport.pageDescription',
          {
            defaultMessage:
              'Correlate a stored threat report against the knowledge base using the Diamond Model pipeline.',
          }
        )}
      />
      <EuiPageTemplate.Section>
        {/* ---- Input panel ---- */}
        <EuiPanel hasBorder paddingSize="m" data-test-subj="correlationReportInputPanel">
          {/* Input type toggle */}
          <EuiButtonGroup
            legend={i18n.translate(
              'xpack.securitySolution.threatIntelligence.correlationReport.inputTypeLegend',
              { defaultMessage: 'Input type' }
            )}
            options={INPUT_TYPE_OPTIONS}
            idSelected={inputTypeOptionId}
            onChange={setInputTypeOptionId}
            buttonSize="s"
            data-test-subj="correlationReportInputTypeToggle"
          />

          <EuiSpacer size="m" />

          {/* Input field */}
          {inputType === 'report_id' ? (
            <EuiFormRow label={i18nText.reportIdLabel()} helpText={i18nText.reportIdHelp()}>
              <EuiFieldText
                value={reportId}
                onChange={(e) => setReportId(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={i18nText.reportIdPlaceholder()}
                disabled={polling}
                data-test-subj="correlationReportIdInput"
              />
            </EuiFormRow>
          ) : (
            <EuiFormRow label={i18nText.rawTextLabel()} helpText={i18nText.rawTextHelp()}>
              <EuiTextArea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder={i18nText.rawTextPlaceholder()}
                disabled={polling}
                rows={6}
                resize="vertical"
                data-test-subj="correlationReportRawTextInput"
              />
            </EuiFormRow>
          )}

          <EuiSpacer size="m" />

          {/* Action row: options gear + run button */}
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiPopover
                isOpen={depthPopoverOpen}
                closePopover={() => setDepthPopoverOpen(false)}
                button={
                  <EuiButtonIcon
                    iconType="gear"
                    aria-label={i18nText.executionOptionsAriaLabel()}
                    onClick={() => setDepthPopoverOpen((v) => !v)}
                    disabled={polling}
                    data-test-subj="correlationReportOptionsBtn"
                  />
                }
                panelPaddingSize="m"
              >
                <EuiTitle size="xs">
                  <h3>{i18nText.executionOptionsTitle()}</h3>
                </EuiTitle>
                <EuiSpacer size="s" />
                <EuiRadioGroup
                  options={depthRadioOptions}
                  idSelected={depth}
                  onChange={(id) => {
                    setDepth(id as CorrelationDepth);
                    setDepthPopoverOpen(false);
                  }}
                  name="correlation-depth-selector"
                  data-test-subj="correlationReportDepthSelector"
                />
              </EuiPopover>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                isDisabled={!isInputValid || polling}
                isLoading={polling}
                onClick={handleRun}
                data-test-subj="correlationReportRunBtn"
              >
                {i18nText.runBtn()}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>

        <EuiSpacer size="l" />

        {/* ---- Progress ---- */}
        {polling ? (
          <EuiEmptyPrompt
            icon={<EuiLoadingSpinner size="xl" />}
            title={<h2>{i18nText.progressTitle()}</h2>}
            body={
              <EuiText size="s" color="subdued">
                {stageLabel}
              </EuiText>
            }
            data-test-subj="correlationReportProgress"
          />
        ) : null}

        {/* ---- Error ---- */}
        {!polling && error ? (
          <EuiCallOut
            title={i18nText.errorTitle()}
            color="danger"
            iconType="alert"
            data-test-subj="correlationReportError"
          >
            <EuiText size="s">{error}</EuiText>
            <EuiSpacer size="s" />
            <EuiButton
              size="s"
              color="danger"
              onClick={handleRetry}
              data-test-subj="correlationReportRetryBtn"
            >
              {i18nText.retryBtn()}
            </EuiButton>
          </EuiCallOut>
        ) : null}

        {/* ---- Result dispatch ---- */}
        {!polling && !error && activeRun?.status === 'succeeded' ? (
          <ResultDispatch run={activeRun} />
        ) : null}

        <EuiSpacer size="xl" />

        {/* ---- Recents ---- */}
        <RecentsPanel
          recents={recents}
          loading={recentsLoading}
          activeRunId={activeRun?.runId}
          onLoadRun={handleLoadRun}
        />
      </EuiPageTemplate.Section>
    </EuiPageTemplate>
  );
};
