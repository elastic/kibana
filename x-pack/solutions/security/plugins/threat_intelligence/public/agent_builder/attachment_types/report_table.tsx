/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiBadge,
  EuiBasicTable,
  type EuiBasicTableColumn,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { CoreStart } from '@kbn/core/public';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import {
  ActionButtonType,
  type AttachmentUIDefinition,
} from '@kbn/agent-builder-browser/attachments';
import type { ReportTablePayload } from '../../../common/attachment_payloads';

const SEVERITY_COLOR: Record<
  ReportTablePayload['reports'][number]['severity'],
  'success' | 'warning' | 'danger' | 'default'
> = {
  low: 'default',
  medium: 'warning',
  high: 'danger',
  critical: 'danger',
};

type ReportTableAttachment = Attachment<'threat-intel-report-table', ReportTablePayload>;

const SECURITY_APP_ID = 'securitySolutionUI' as const;
const CASES_CREATE_DEEP_LINK = 'cases_create' as const;

/**
 * Controller bridge identical in spirit to the one used by the finding card:
 * the inline renderer publishes a small object on `window` keyed by
 * attachment id so the header `getActionButtons` handlers can flip the
 * local dismissed state.
 */
interface ReportTableController {
  isDismissed: boolean;
  dismiss: () => void;
  unhide: () => void;
}

const controllerKey = (attachmentId: string): string => `__threatIntelReportTable_${attachmentId}`;

const readController = (attachmentId: string): ReportTableController | undefined =>
  (window as unknown as Record<string, ReportTableController | undefined>)[
    controllerKey(attachmentId)
  ];

const ReportTableBody: React.FC<{ attachment: ReportTableAttachment }> = ({ attachment }) => {
  const { reports, time_range_label: range } = attachment.data;
  const [isDismissed, setIsDismissed] = useState<boolean>(false);

  useEffect(() => {
    const key = controllerKey(attachment.id);
    const controller: ReportTableController = {
      get isDismissed() {
        return isDismissed;
      },
      dismiss: () => setIsDismissed(true),
      unhide: () => setIsDismissed(false),
    };
    (window as unknown as Record<string, ReportTableController>)[key] = controller;
    return () => {
      delete (window as unknown as Record<string, ReportTableController | undefined>)[key];
    };
  }, [attachment.id, isDismissed]);

  if (isDismissed) {
    return (
      <EuiPanel hasBorder paddingSize="m" color="subdued">
        <EuiFlexGroup alignItems="center" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow">
              {i18n.translate('xpack.threatIntelligence.attachments.reportTable.dismissedBadge', {
                defaultMessage: 'Dismissed',
              })}
            </EuiBadge>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="xs" color="subdued">
              {i18n.translate('xpack.threatIntelligence.attachments.reportTable.dismissedBody', {
                defaultMessage:
                  'Report table for {range} dismissed locally — no server state was changed.',
                values: { range },
              })}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    );
  }

  const columns: Array<EuiBasicTableColumn<ReportTablePayload['reports'][number]>> = [
    {
      field: 'title',
      name: i18n.translate('xpack.threatIntelligence.attachments.reportTable.col.title', {
        defaultMessage: 'Title',
      }),
      render: (title: string, row) =>
        row.source.url ? (
          <EuiLink href={row.source.url} target="_blank">
            {title}
          </EuiLink>
        ) : (
          title
        ),
    },
    {
      field: 'source.name',
      name: i18n.translate('xpack.threatIntelligence.attachments.reportTable.col.source', {
        defaultMessage: 'Source',
      }),
    },
    {
      field: 'severity',
      name: i18n.translate('xpack.threatIntelligence.attachments.reportTable.col.severity', {
        defaultMessage: 'Severity',
      }),
      render: (severity: ReportTablePayload['reports'][number]['severity']) => (
        <EuiBadge color={SEVERITY_COLOR[severity]}>{severity}</EuiBadge>
      ),
    },
    {
      field: 'techniques',
      name: i18n.translate('xpack.threatIntelligence.attachments.reportTable.col.techniques', {
        defaultMessage: 'Techniques',
      }),
      render: (techniques: string[]) => (
        <EuiText size="xs">{techniques.slice(0, 4).join(', ') || '—'}</EuiText>
      ),
    },
    {
      field: 'iocs',
      name: i18n.translate('xpack.threatIntelligence.attachments.reportTable.col.iocs', {
        defaultMessage: 'IOCs',
      }),
      render: (iocs: ReportTablePayload['reports'][number]['iocs']) => (
        <EuiText size="xs">{iocs.length}</EuiText>
      ),
    },
    {
      field: 'environment_hits_total',
      name: i18n.translate('xpack.threatIntelligence.attachments.reportTable.col.envHits', {
        defaultMessage: 'Env. hits',
      }),
      render: (hits?: number) => (hits ? <EuiBadge color="danger">{hits}</EuiBadge> : '—'),
    },
    {
      field: 'related_reports',
      name: i18n.translate('xpack.threatIntelligence.attachments.reportTable.col.related', {
        defaultMessage: 'Related',
      }),
      render: (related: ReportTablePayload['reports'][number]['related_reports']) => {
        if (!related || related.count === 0) return <EuiText size="xs">—</EuiText>;
        const sample = related.top_ids.slice(0, 3).join(', ');
        return (
          <EuiBadge
            color="hollow"
            title={i18n.translate(
              'xpack.threatIntelligence.attachments.reportTable.relatedTooltip',
              {
                defaultMessage:
                  'Shares its IOC set with {count} other report(s). Examples: {sample}.',
                values: { count: related.count, sample },
              }
            )}
          >
            {i18n.translate('xpack.threatIntelligence.attachments.reportTable.relatedBadge', {
              defaultMessage: 'shares · {count}',
              values: { count: related.count },
            })}
          </EuiBadge>
        );
      },
    },
  ];

  return (
    <EuiPanel hasBorder paddingSize="m">
      <EuiTitle size="xs">
        <h4>
          {i18n.translate('xpack.threatIntelligence.attachments.reportTable.title', {
            defaultMessage: 'Threat reports',
          })}
        </h4>
      </EuiTitle>
      <EuiText size="xs" color="subdued">
        {range}
      </EuiText>
      <EuiSpacer size="s" />
      <EuiBasicTable
        items={reports}
        columns={columns}
        compressed
        tableCaption={i18n.translate(
          'xpack.threatIntelligence.attachments.reportTable.tableCaption',
          { defaultMessage: 'Threat reports for {range}', values: { range } }
        )}
      />
    </EuiPanel>
  );
};

/**
 * Builds a description body for the batch-investigation Case, summarising
 * the reports in the table. The Cases create page may or may not consume
 * `state.initialValue` on this build; the navigation still works either
 * way, the analyst just loses the prefill in the absence of the consumer.
 */
const buildBatchCasePayload = (
  data: ReportTablePayload
): { title: string; description: string; tags: string[] } => {
  const lines = data.reports.slice(0, 10).map((r) => {
    const techniques = r.techniques.slice(0, 4).join(', ') || 'no techniques';
    const url = r.source.url ? ` (${r.source.url})` : '';
    return `- **${r.title}** [${r.severity}] — ${r.source.name}${url} · ${techniques}`;
  });
  const overflow =
    data.reports.length > lines.length
      ? `\n\n…and ${
          data.reports.length - lines.length
        } more report(s) in the original chat attachment.`
      : '';
  return {
    title: i18n.translate('xpack.threatIntelligence.attachments.reportTable.caseTitle', {
      defaultMessage: 'Investigate threat-intel digest ({range})',
      values: { range: data.time_range_label },
    }),
    description: `Threat reports for **${data.time_range_label}**:\n\n${lines.join(
      '\n'
    )}${overflow}`,
    tags: ['threat-intel', 'threat-intel-digest', `range:${data.time_range_label}`],
  };
};

export const buildReportTableUiDefinition = (
  core: CoreStart
): AttachmentUIDefinition<ReportTableAttachment> => {
  const handleInvestigate = async (attachment: ReportTableAttachment) => {
    const initial = buildBatchCasePayload(attachment.data);
    await core.application.navigateToApp(SECURITY_APP_ID, {
      deepLinkId: CASES_CREATE_DEEP_LINK,
      state: { initialValue: initial },
    });
  };

  const handleDismiss = (attachment: ReportTableAttachment) => {
    readController(attachment.id)?.dismiss();
  };

  return {
    getLabel: (attachment) =>
      attachment.data?.attachmentLabel ??
      i18n.translate('xpack.threatIntelligence.attachments.reportTable.label', {
        defaultMessage: 'Threat report table',
      }),
    getIcon: () => 'documents',
    renderInlineContent: ({ attachment }) => <ReportTableBody attachment={attachment} />,
    getActionButtons: ({ attachment }) => {
      const dismissed = readController(attachment.id)?.isDismissed === true;
      if (dismissed) {
        return [
          {
            label: i18n.translate(
              'xpack.threatIntelligence.attachments.reportTable.undoDismissAction',
              { defaultMessage: 'Undo dismiss' }
            ),
            type: ActionButtonType.SECONDARY,
            icon: 'refresh',
            handler: () => readController(attachment.id)?.unhide(),
          },
        ];
      }
      const hasReports = attachment.data.reports.length > 0;
      return [
        {
          label: i18n.translate(
            'xpack.threatIntelligence.attachments.reportTable.investigateAction',
            { defaultMessage: 'Investigate' }
          ),
          type: ActionButtonType.PRIMARY,
          icon: 'casesApp',
          disabled: !hasReports,
          disabledReason: hasReports
            ? undefined
            : i18n.translate(
                'xpack.threatIntelligence.attachments.reportTable.investigateDisabledReason',
                { defaultMessage: 'Nothing to investigate — the report table is empty.' }
              ),
          handler: () => handleInvestigate(attachment),
        },
        {
          label: i18n.translate('xpack.threatIntelligence.attachments.reportTable.dismissAction', {
            defaultMessage: 'Dismiss',
          }),
          type: ActionButtonType.OVERFLOW,
          icon: 'cross',
          handler: () => handleDismiss(attachment),
        },
      ];
    },
  };
};
