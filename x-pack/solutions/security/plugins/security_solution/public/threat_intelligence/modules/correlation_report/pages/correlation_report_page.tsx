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
  EuiLink,
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
import type {
  CorrelationFindingsLead,
  CostTrace,
} from '../../../../../common/threat_intelligence/correlation';
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
  const { candidate_meta } = result;

  const mergedColumns: Array<EuiBasicTableColumn<MergedCandidate>> = useMemo(
    (): Array<EuiBasicTableColumn<MergedCandidate>> => [
      {
        name: i18nText.knnColTitle(),
        render: (item: MergedCandidate) => {
          const meta = candidate_meta?.[item.report_id];
          const title = meta?.title ?? item.title;
          return (
            <div>
              {meta?.url ? (
                <EuiLink href={meta.url} target="_blank" external>
                  {title}
                </EuiLink>
              ) : (
                <span>{title}</span>
              )}
              {meta?.vendor ? (
                <EuiText size="xs" color="subdued">
                  {meta.vendor}
                </EuiText>
              ) : null}
            </div>
          );
        },
      },
      {
        field: 'overlap',
        name: i18nText.knnColOverlap(),
        width: '80px',
        render: (value: MergedCandidate['overlap']) => (value ?? 0).toFixed(2),
      },
      {
        field: 'score',
        name: i18nText.knnColScore(),
        width: '80px',
        render: (value: MergedCandidate['score']) => (value ?? 0).toFixed(3),
      },
      {
        name: i18nText.knnColVertexScores(),
        render: (item: MergedCandidate) => {
          const entries = Object.entries(item.vertex_scores ?? {});
          if (entries.length === 0) {
            return (
              <EuiText size="xs" color="subdued">
                {i18nText.knnAnchorOnly()}
              </EuiText>
            );
          }
          return (
            <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
              {entries.map(([k, v]) => (
                <EuiFlexItem key={k} grow={false}>
                  <EuiBadge color="hollow">
                    {`${k.slice(0, 3).toUpperCase()}: ${v.toFixed(2)}`}
                  </EuiBadge>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          );
        },
      },
    ],
    [candidate_meta]
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
          {result.anchor_hits.map((hit: AnchorHit) => {
            const meta = candidate_meta?.[hit.report_id];
            const title = meta?.title ?? hit.title;
            return (
              <div key={hit.report_id}>
                {meta?.url ? (
                  <EuiLink href={meta.url} target="_blank" external>
                    <EuiText size="s" component="span">
                      {title}
                    </EuiText>
                  </EuiLink>
                ) : (
                  <EuiText size="s">{title}</EuiText>
                )}
                {meta?.vendor ? (
                  <EuiText size="xs" color="subdued">
                    {meta.vendor}
                  </EuiText>
                ) : null}
              </div>
            );
          })}
        </>
      ) : null}
    </EuiPanel>
  );
};

// ---------------------------------------------------------------------------
// TriageResultView
// ---------------------------------------------------------------------------

type TriagePick = TriageDepthResult['picks'][number];
type TriagedOut = NonNullable<TriageDepthResult['triaged_out']>[number];

const TriageResultView: FC<{ result: TriageDepthResult }> = ({ result }) => {
  const { candidate_meta } = result;

  const renderCandidateCell = (candidateId: string): React.ReactNode => {
    const meta = candidate_meta?.[candidateId];
    const title = meta?.title ?? candidateId;
    return (
      <div>
        {meta?.url ? (
          <EuiLink href={meta.url} target="_blank" external>
            {title}
          </EuiLink>
        ) : (
          <span>{title}</span>
        )}
        {meta?.vendor ? (
          <EuiText size="xs" color="subdued">
            {meta.vendor}
          </EuiText>
        ) : null}
      </div>
    );
  };

  const picksColumns: Array<EuiBasicTableColumn<TriagePick>> = useMemo(
    (): Array<EuiBasicTableColumn<TriagePick>> => [
      {
        name: i18nText.triageColCandidate(),
        render: (item: TriagePick) => renderCandidateCell(item.candidate_id),
      },
      {
        field: 'confidence',
        name: i18nText.triageColConfidence(),
        width: '80px',
        render: (value: TriagePick['confidence']) => value.toFixed(2),
      },
      {
        field: 'justification',
        name: i18nText.triageColJustification(),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [candidate_meta]
  );

  const triagedOutColumns: Array<EuiBasicTableColumn<TriagedOut>> = useMemo(
    (): Array<EuiBasicTableColumn<TriagedOut>> => [
      {
        name: i18nText.triageColCandidate(),
        render: (item: TriagedOut) => renderCandidateCell(item.candidate_id),
      },
      {
        field: 'score',
        name: i18nText.triageColScore(),
        width: '80px',
        render: (value: number) => (value > 0 ? value.toFixed(2) : '—'),
      },
      {
        field: 'reason',
        name: i18nText.triageColReason(),
        width: '120px',
        render: (value: string) =>
          value === 'below_floor'
            ? i18nText.triageReasonBelowFloor()
            : i18nText.triageReasonNotSelected(),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [candidate_meta]
  );

  const triagedOut = result.triaged_out ?? [];

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
        <h3>
          {i18nText.triagePicksTitle()}
          {` (${result.picks.length})`}
        </h3>
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

      {triagedOut.length > 0 ? (
        <>
          <EuiSpacer size="m" />
          <EuiTitle size="xs">
            <h3>
              {i18nText.triageTriagedOutTitle()}
              {` (${triagedOut.length})`}
            </h3>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiBasicTable<TriagedOut>
            items={triagedOut}
            columns={triagedOutColumns}
            rowProps={(item: TriagedOut) => ({
              'data-test-subj': `triageTriagedOutRow-${item.candidate_id}`,
            })}
          />
        </>
      ) : null}

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
              {group.candidates.map((c) => {
                const meta = candidate_meta?.[c.candidate_id];
                const title = meta?.title ?? c.candidate_id;
                return (
                  <EuiText key={c.candidate_id} size="xs" color="subdued">
                    {`${title} — ${c.confidence.toFixed(2)}`}
                  </EuiText>
                );
              })}
            </EuiPanel>
          ))}
        </>
      ) : null}
    </EuiPanel>
  );
};

// ---------------------------------------------------------------------------
// CostTracePanel — compact per-stage token + cost breakdown
// ---------------------------------------------------------------------------

const formatCost = (usd: number): string => {
  if (usd === 0) return '$0.00';
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  return `$${usd.toFixed(2)}`;
};

const CostTracePanel: FC<{ trace: CostTrace }> = ({ trace }) => {
  if (trace.total_cost_usd === 0 && trace.stages.length === 0) return null;

  const columns: Array<EuiBasicTableColumn<CostTrace['stages'][number]>> = [
    {
      field: 'stage',
      name: i18nText.costTraceStageCol(),
      truncateText: true,
    },
    {
      field: 'model_name',
      name: i18nText.costTraceModelCol(),
      truncateText: true,
      render: (v: string | undefined) => v ?? '—',
    },
    {
      name: i18nText.costTraceTokensCol(),
      render: (row: CostTrace['stages'][number]) =>
        `${row.input_tokens.toLocaleString()} / ${row.output_tokens.toLocaleString()}`,
    },
    {
      field: 'cost_usd',
      name: i18nText.costTraceCostCol(),
      width: '100px',
      render: (v: number) => formatCost(v),
    },
  ];

  return (
    <EuiPanel hasBorder paddingSize="m" data-test-subj="correlationCostTrace">
      <EuiFlexGroup
        gutterSize="s"
        alignItems="center"
        justifyContent="spaceBetween"
        responsive={false}
      >
        <EuiFlexItem grow={false}>
          <EuiTitle size="xxs">
            <h3>{i18nText.costTraceSectionTitle()}</h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            {`${i18nText.costTraceTotal()}: ${trace.total_input_tokens.toLocaleString()} / ${trace.total_output_tokens.toLocaleString()} tokens · ${formatCost(
              trace.total_cost_usd
            )}`}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiBasicTable<CostTrace['stages'][number]>
        items={trace.stages}
        columns={columns}
        compressed
      />
    </EuiPanel>
  );
};

// ---------------------------------------------------------------------------
// ResultDispatch — routes to the correct result view by depth
// ---------------------------------------------------------------------------

const ResultDispatch: FC<{
  run: CorrelationRun;
  onTitleSave: (title: string) => Promise<void>;
}> = ({ run, onTitleSave }) => {
  const { result } = run;
  if (result === undefined) return null;

  const runTitle = run.title ?? run.input_summary ?? run.runId;

  if (result.depth === 'full') {
    const fullResult = result as FullDepthResult;
    const trace = fullResult.findings.trace;
    return (
      <>
        <CorrelationReport
          findings={fullResult.findings}
          candidateMeta={fullResult.findings.candidate_meta}
          title={runTitle}
          runId={run.runId}
          onTitleSave={onTitleSave}
        />
        {trace !== undefined ? (
          <>
            <EuiSpacer size="m" />
            <CostTracePanel trace={trace} />
          </>
        ) : null}
      </>
    );
  }

  const traceForDepth = (result as ExtractDepthResult | KnnDepthResult | TriageDepthResult).trace;

  if (result.depth === 'extract') {
    return (
      <>
        <ExtractResultView result={result as ExtractDepthResult} />
        {traceForDepth !== undefined ? (
          <>
            <EuiSpacer size="m" />
            <CostTracePanel trace={traceForDepth} />
          </>
        ) : null}
      </>
    );
  }

  if (result.depth === 'knn') {
    return (
      <>
        <KnnResultView result={result as KnnDepthResult} />
        {traceForDepth !== undefined ? (
          <>
            <EuiSpacer size="m" />
            <CostTracePanel trace={traceForDepth} />
          </>
        ) : null}
      </>
    );
  }

  if (result.depth === 'triage') {
    return (
      <>
        <TriageResultView result={result as TriageDepthResult} />
        {traceForDepth !== undefined ? (
          <>
            <EuiSpacer size="m" />
            <CostTracePanel trace={traceForDepth} />
          </>
        ) : null}
      </>
    );
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
        <EuiListGroup bordered maxWidth={false}>
          {sorted.map((run) => (
            <EuiListGroupItem
              key={run.runId}
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
                    <EuiText size="xs">
                      {run.title ?? run.input_summary ?? run.runId.slice(0, 16)}
                    </EuiText>
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

  const {
    activeRun,
    polling,
    error,
    recents,
    recentsLoading,
    startRun,
    loadRun,
    refreshRecents,
    updateRunTitle,
  } = useCorrelationRuns();

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
          <ResultDispatch
            run={activeRun}
            onTitleSave={(title) => updateRunTitle(activeRun.runId, title)}
          />
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
