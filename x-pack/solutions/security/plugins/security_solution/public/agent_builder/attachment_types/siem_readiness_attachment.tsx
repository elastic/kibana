/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiBasicTable,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { AttachmentServiceStartContract } from '@kbn/agent-builder-browser/attachments';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import { SecurityAgentBuilderAttachments } from '../../../common/constants';
import { useBasePath } from '../../common/lib/kibana';
import { RuleCoveragePanel } from '../../siem_readiness/pages/tabs/coverage_tab/rule_coverage_panel';

// ──────────────────────────────────────────────────────────────────────────────
// Attachment data types (mirror the server-side schemas)
// ──────────────────────────────────────────────────────────────────────────────

interface CoverageData {
  attachmentLabel?: string;
  summary?: string;
  covered_rules: number;
  uncovered_rules: number;
  missing_integrations: string[];
  active_categories: string[];
}

interface QualityIndexRow {
  index_name: string;
  status: 'healthy' | 'incompatible';
  incompatible_fields: number;
}

interface QualityData {
  attachmentLabel?: string;
  summary?: string;
  checked_indices: number;
  healthy_indices: number;
  incompatible_indices: number;
  unchecked_indices: number;
  indices?: QualityIndexRow[];
}

type DropSeverity = 'none' | 'warning' | 'critical';
type LatencyStatus = 'ok' | 'warning' | 'critical' | 'unknown';

interface PipelineVolumeStats {
  current24h: number;
  baseline: number | null;
  lastEventMs?: number | null;
  hoursSilent?: number | null;
  silenceDetected: boolean;
  criticalSilence?: boolean;
  dropPercent?: number | null;
  dropSeverity?: DropSeverity;
  latencyP95Ms?: number | null;
}

interface PipelineRow {
  pipeline_name: string;
  status: 'healthy' | 'critical';
  failure_rate: string;
  latency_status?: LatencyStatus;
  latency_sla_ms?: number;
  volume?: PipelineVolumeStats | null;
}

interface ContinuityData {
  attachmentLabel?: string;
  pipelines: PipelineRow[];
  summary?: string;
}

interface RetentionIndexRow {
  index_name: string;
  managed_by: 'ILM' | 'DSL' | 'None';
  is_data_stream: boolean;
  policy_name?: string | null;
  status: 'healthy' | 'non-compliant';
  retention_period?: string | null;
}

interface RetentionData {
  attachmentLabel?: string;
  indices: RetentionIndexRow[];
  summary?: string;
}

type CoverageAttachment = Attachment<string, CoverageData>;
type QualityAttachment = Attachment<string, QualityData>;
type ContinuityAttachment = Attachment<string, ContinuityData>;
type RetentionAttachment = Attachment<string, RetentionData>;

// ──────────────────────────────────────────────────────────────────────────────
// Coverage renderer — reuses the live RuleCoveragePanel (fetches its own data)
// ──────────────────────────────────────────────────────────────────────────────

const CoverageInlineContent: React.FC = () => {
  return <RuleCoveragePanel />;
};

// ──────────────────────────────────────────────────────────────────────────────
// Quality renderer — per-index table + link to Data Quality Dashboard
// ──────────────────────────────────────────────────────────────────────────────

const qualityIndexColumns = [
  {
    field: 'index_name',
    name: i18n.translate('xpack.securitySolution.agentBuilder.siemReadiness.quality.table.index', {
      defaultMessage: 'Index',
    }),
    truncateText: true,
  },
  {
    field: 'status',
    name: i18n.translate('xpack.securitySolution.agentBuilder.siemReadiness.quality.table.status', {
      defaultMessage: 'Status',
    }),
    width: '130px',
    render: (status: 'healthy' | 'incompatible') => (
      <EuiHealth color={status === 'healthy' ? 'success' : 'danger'}>
        {status === 'healthy'
          ? i18n.translate(
              'xpack.securitySolution.agentBuilder.siemReadiness.quality.status.healthy',
              { defaultMessage: 'Healthy' }
            )
          : i18n.translate(
              'xpack.securitySolution.agentBuilder.siemReadiness.quality.status.incompatible',
              { defaultMessage: 'Incompatible' }
            )}
      </EuiHealth>
    ),
  },
  {
    field: 'incompatible_fields',
    name: i18n.translate(
      'xpack.securitySolution.agentBuilder.siemReadiness.quality.table.incompatibleFields',
      { defaultMessage: 'Incompatible fields' }
    ),
    width: '160px',
    render: (count: number) =>
      count > 0 ? (
        <EuiText size="s" color="danger">
          {count}
        </EuiText>
      ) : (
        count
      ),
  },
];

const QualityInlineContent: React.FC<{ attachment: QualityAttachment }> = ({ attachment }) => {
  const basePath = useBasePath();
  const dataQualityUrl = `${basePath}/app/security/data_quality`;
  const { data } = attachment;

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      {data.indices && data.indices.length > 0 ? (
        <EuiFlexItem grow={false}>
          <EuiBasicTable
            tableCaption={i18n.translate(
              'xpack.securitySolution.agentBuilder.siemReadiness.quality.tableCaption',
              { defaultMessage: 'Index data quality' }
            )}
            items={data.indices}
            columns={qualityIndexColumns}
            compressed
          />
        </EuiFlexItem>
      ) : (
        <EuiFlexItem grow={false}>
          <EuiText size="s" color="subdued">
            {i18n.translate('xpack.securitySolution.agentBuilder.siemReadiness.quality.noIndices', {
              defaultMessage:
                '{checked} checked · {healthy} healthy · {incompatible} incompatible · {unchecked} unchecked',
              values: {
                checked: data.checked_indices,
                healthy: data.healthy_indices,
                incompatible: data.incompatible_indices,
                unchecked: data.unchecked_indices,
              },
            })}
          </EuiText>
        </EuiFlexItem>
      )}
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          size="s"
          iconType="popout"
          href={dataQualityUrl}
          target="_blank"
          flush="left"
        >
          {i18n.translate(
            'xpack.securitySolution.agentBuilder.siemReadiness.quality.openDashboard',
            { defaultMessage: 'Open Data Quality Dashboard' }
          )}
        </EuiButtonEmpty>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

// ──────────────────────────────────────────────────────────────────────────────
// Continuity renderer — table of all pipelines with links
// ──────────────────────────────────────────────────────────────────────────────

const getIngestPipelineUrl = (basePath: string, pipelineName: string): string =>
  `${basePath}/app/management/ingest/ingest_pipelines?pipeline=${encodeURIComponent(pipelineName)}`;

const ContinuityInlineContent: React.FC<{ attachment: ContinuityAttachment }> = ({
  attachment,
}) => {
  const basePath = useBasePath();
  const { data } = attachment;

  const continuityColumns = useMemo(
    () => [
      {
        field: 'pipeline_name',
        name: i18n.translate(
          'xpack.securitySolution.agentBuilder.siemReadiness.continuity.table.pipeline',
          { defaultMessage: 'Pipeline' }
        ),
        truncateText: true,
        render: (name: string) => (
          <EuiButtonEmpty
            size="xs"
            iconType="popout"
            iconSide="right"
            href={getIngestPipelineUrl(basePath, name)}
            target="_blank"
            flush="left"
          >
            {name}
          </EuiButtonEmpty>
        ),
      },
      {
        field: 'status',
        name: i18n.translate(
          'xpack.securitySolution.agentBuilder.siemReadiness.continuity.table.status',
          { defaultMessage: 'Status' }
        ),
        width: '110px',
        render: (status: 'healthy' | 'critical') => (
          <EuiHealth color={status === 'critical' ? 'danger' : 'success'}>
            {status === 'critical'
              ? i18n.translate(
                  'xpack.securitySolution.agentBuilder.siemReadiness.continuity.status.critical',
                  { defaultMessage: 'Critical' }
                )
              : i18n.translate(
                  'xpack.securitySolution.agentBuilder.siemReadiness.continuity.status.healthy',
                  { defaultMessage: 'Healthy' }
                )}
          </EuiHealth>
        ),
      },
      {
        field: 'failure_rate',
        name: i18n.translate(
          'xpack.securitySolution.agentBuilder.siemReadiness.continuity.table.failureRate',
          { defaultMessage: 'Failure rate' }
        ),
        width: '120px',
      },
      {
        field: 'latency_status',
        name: i18n.translate(
          'xpack.securitySolution.agentBuilder.siemReadiness.continuity.table.latency',
          { defaultMessage: 'Latency p95' }
        ),
        width: '110px',
        render: (latencyStatus: LatencyStatus | undefined, row: PipelineRow) => {
          if (latencyStatus == null || latencyStatus === 'unknown') return null;
          const color =
            latencyStatus === 'critical'
              ? 'danger'
              : latencyStatus === 'warning'
              ? 'warning'
              : 'success';
          const slaLabel =
            row.latency_sla_ms != null
              ? ` / ${
                  row.latency_sla_ms >= 3_600_000
                    ? `${row.latency_sla_ms / 3_600_000}h`
                    : `${row.latency_sla_ms / 60_000}m`
                }`
              : '';
          const p95Label =
            row.volume?.latencyP95Ms != null
              ? row.volume.latencyP95Ms >= 60_000
                ? `${(row.volume.latencyP95Ms / 60_000).toFixed(1)}m`
                : `${Math.round(row.volume.latencyP95Ms / 1_000)}s`
              : latencyStatus;
          return (
            <EuiHealth color={color}>
              <EuiText size="xs">{`${p95Label}${slaLabel}`}</EuiText>
            </EuiHealth>
          );
        },
      },
      {
        field: 'volume',
        name: i18n.translate(
          'xpack.securitySolution.agentBuilder.siemReadiness.continuity.table.volume',
          { defaultMessage: 'Volume (24h / baseline)' }
        ),
        width: '170px',
        render: (volume: PipelineVolumeStats | null | undefined) => {
          if (volume == null) return null;

          const isCritical = volume.criticalSilence;
          const isSilent = volume.silenceDetected;
          const isDropCritical = volume.dropSeverity === 'critical';
          const isDropWarning = volume.dropSeverity === 'warning';

          const color =
            isCritical || isDropCritical
              ? 'danger'
              : isSilent || isDropWarning
              ? 'warning'
              : 'success';

          if (isCritical) {
            const hrs = volume.hoursSilent != null ? ` (${volume.hoursSilent.toFixed(1)}h)` : '';
            return (
              <EuiHealth color="danger">
                <EuiText size="xs">
                  {i18n.translate(
                    'xpack.securitySolution.agentBuilder.siemReadiness.continuity.volume.criticalSilence',
                    { defaultMessage: 'Critical silence{hrs}', values: { hrs } }
                  )}
                </EuiText>
              </EuiHealth>
            );
          }

          if (isSilent) {
            return (
              <EuiHealth color="warning">
                {i18n.translate(
                  'xpack.securitySolution.agentBuilder.siemReadiness.continuity.volume.silent',
                  { defaultMessage: 'Silent' }
                )}
              </EuiHealth>
            );
          }

          if (isDropCritical || isDropWarning) {
            const pct = volume.dropPercent != null ? ` −${volume.dropPercent}%` : '';
            return (
              <EuiHealth color={color}>
                <EuiText size="xs">
                  {i18n.translate(
                    'xpack.securitySolution.agentBuilder.siemReadiness.continuity.volume.drop',
                    { defaultMessage: 'Drop{pct}', values: { pct } }
                  )}
                </EuiText>
              </EuiHealth>
            );
          }

          return (
            <EuiHealth color="success">
              <EuiText size="xs">
                {`${volume.current24h.toLocaleString()} / ${
                  volume.baseline != null ? volume.baseline.toLocaleString() : '—'
                }`}
              </EuiText>
            </EuiHealth>
          );
        },
      },
    ],
    [basePath]
  );

  return (
    <EuiBasicTable
      tableCaption={i18n.translate(
        'xpack.securitySolution.agentBuilder.siemReadiness.continuity.tableCaption',
        { defaultMessage: 'Ingest pipeline health' }
      )}
      items={data.pipelines ?? []}
      columns={continuityColumns}
      compressed
    />
  );
};

// ──────────────────────────────────────────────────────────────────────────────
// Retention renderer — table of all indices with links
// ──────────────────────────────────────────────────────────────────────────────

const getRetentionRowUrl = (basePath: string, row: RetentionIndexRow): string => {
  if (row.managed_by === 'ILM' && row.policy_name) {
    return `${basePath}/app/management/data/index_lifecycle_management/policies?policy=${encodeURIComponent(
      row.policy_name
    )}`;
  }
  if (row.is_data_stream) {
    return `${basePath}/app/management/data/index_management/data_streams/${encodeURIComponent(
      row.index_name
    )}`;
  }
  return `${basePath}/app/management/data/index_management/indices/index_details?indexName=${encodeURIComponent(
    row.index_name
  )}`;
};

const RetentionInlineContent: React.FC<{ attachment: RetentionAttachment }> = ({ attachment }) => {
  const basePath = useBasePath();
  const { data } = attachment;

  const retentionColumns = useMemo(
    () => [
      {
        field: 'index_name',
        name: i18n.translate(
          'xpack.securitySolution.agentBuilder.siemReadiness.retention.table.index',
          { defaultMessage: 'Index' }
        ),
        truncateText: true,
        render: (name: string, row: RetentionIndexRow) => (
          <EuiButtonEmpty
            size="xs"
            iconType="popout"
            iconSide="right"
            href={getRetentionRowUrl(basePath, row)}
            target="_blank"
            flush="left"
          >
            {name}
          </EuiButtonEmpty>
        ),
      },
      {
        field: 'status',
        name: i18n.translate(
          'xpack.securitySolution.agentBuilder.siemReadiness.retention.table.status',
          { defaultMessage: 'Status' }
        ),
        width: '140px',
        render: (status: 'healthy' | 'non-compliant') => (
          <EuiHealth color={status === 'non-compliant' ? 'warning' : 'success'}>
            {status === 'non-compliant'
              ? i18n.translate(
                  'xpack.securitySolution.agentBuilder.siemReadiness.retention.status.nonCompliant',
                  { defaultMessage: 'Non-compliant' }
                )
              : i18n.translate(
                  'xpack.securitySolution.agentBuilder.siemReadiness.retention.status.healthy',
                  { defaultMessage: 'Healthy' }
                )}
          </EuiHealth>
        ),
      },
      {
        field: 'retention_period',
        name: i18n.translate(
          'xpack.securitySolution.agentBuilder.siemReadiness.retention.table.retentionPeriod',
          { defaultMessage: 'Retention' }
        ),
        width: '110px',
        render: (period: string | null | undefined) =>
          period ?? (
            <EuiText size="s" color="subdued">
              {i18n.translate(
                'xpack.securitySolution.agentBuilder.siemReadiness.retention.table.noLimit',
                { defaultMessage: 'No limit' }
              )}
            </EuiText>
          ),
      },
      {
        field: 'managed_by',
        name: i18n.translate(
          'xpack.securitySolution.agentBuilder.siemReadiness.retention.table.managedBy',
          { defaultMessage: 'Managed by' }
        ),
        width: '100px',
      },
    ],
    [basePath]
  );

  return (
    <EuiBasicTable
      tableCaption={i18n.translate(
        'xpack.securitySolution.agentBuilder.siemReadiness.retention.tableCaption',
        { defaultMessage: 'Data retention' }
      )}
      items={data.indices ?? []}
      columns={retentionColumns}
      compressed
    />
  );
};

// ──────────────────────────────────────────────────────────────────────────────
// Registration entry point
// ──────────────────────────────────────────────────────────────────────────────

export const registerSiemReadinessAttachments = (
  attachments: AttachmentServiceStartContract
): void => {
  attachments.addAttachmentType<CoverageAttachment>(
    SecurityAgentBuilderAttachments.siemReadinessCoverage,
    {
      getLabel: (attachment) =>
        attachment.data.attachmentLabel ??
        i18n.translate('xpack.securitySolution.agentBuilder.siemReadiness.coverage.label', {
          defaultMessage: 'Rule Coverage',
        }),
      getIcon: () => 'securityApp',
      renderInlineContent: () => <CoverageInlineContent />,
    }
  );

  attachments.addAttachmentType<QualityAttachment>(
    SecurityAgentBuilderAttachments.siemReadinessQuality,
    {
      getLabel: (attachment) =>
        attachment.data.attachmentLabel ??
        i18n.translate('xpack.securitySolution.agentBuilder.siemReadiness.quality.label', {
          defaultMessage: 'Data Quality',
        }),
      getIcon: () => 'indexPatternApp',
      renderInlineContent: (props) => <QualityInlineContent attachment={props.attachment} />,
    }
  );

  attachments.addAttachmentType<ContinuityAttachment>(
    SecurityAgentBuilderAttachments.siemReadinessContinuity,
    {
      getLabel: (attachment) =>
        attachment.data.attachmentLabel ??
        i18n.translate('xpack.securitySolution.agentBuilder.siemReadiness.continuity.label', {
          defaultMessage: 'Ingest Pipelines',
        }),
      getIcon: () => 'pipelineApp',
      renderInlineContent: (props) => <ContinuityInlineContent attachment={props.attachment} />,
    }
  );

  attachments.addAttachmentType<RetentionAttachment>(
    SecurityAgentBuilderAttachments.siemReadinessRetention,
    {
      getLabel: (attachment) =>
        attachment.data.attachmentLabel ??
        i18n.translate('xpack.securitySolution.agentBuilder.siemReadiness.retention.label', {
          defaultMessage: 'Data Retention',
        }),
      getIcon: () => 'indexManagementApp',
      renderInlineContent: (props) => <RetentionInlineContent attachment={props.attachment} />,
    }
  );
};
