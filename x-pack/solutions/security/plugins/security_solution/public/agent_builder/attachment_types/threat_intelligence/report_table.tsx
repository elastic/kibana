/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
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
import type {
  ReportTablePayload,
  SeverityLevel,
  ThreatCategory,
} from '../../../../common/threat_intelligence/hub';
import {
  ThreatReportFeed,
  fromReportTableRow,
  type ReportFeedSort,
} from '../../../threat_intelligence/components/report_feed';

type ReportTableAttachment = Attachment<'threat-intel-report-table', ReportTablePayload>;

const SECURITY_APP_ID = 'securitySolutionUI' as const;
const CASES_CREATE_DEEP_LINK = 'cases_create' as const;
const INTELLIGENCE_HUB_CANVAS_WIDTH = 'min(96vw, 1400px)';

const CANVAS_PREVIEW_LABEL = i18n.translate(
  'xpack.securitySolution.threatIntelligence.attachments.reportTable.canvasPreview',
  { defaultMessage: 'Open Intelligence Hub' }
);

const LazyReportTableCanvasContent = React.lazy(() =>
  import(
    /* webpackChunkName: "security_threat_intel_report_table_canvas" */
    './report_table_canvas_content'
  ).then((m) => ({ default: m.ReportTableCanvasContent }))
);

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
  const [selectedSeverities, setSelectedSeverities] = useState<SeverityLevel[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<ThreatCategory[]>([]);
  const [sortBy, setSortBy] = useState<ReportFeedSort>('relevance');

  const feedItems = useMemo(() => reports.map(fromReportTableRow), [reports]);

  const onToggleSeverity = useCallback((severity: SeverityLevel) => {
    setSelectedSeverities((current) =>
      current.includes(severity) ? current.filter((s) => s !== severity) : [...current, severity]
    );
  }, []);

  const onToggleCategory = useCallback((category: ThreatCategory) => {
    setSelectedCategories((current) =>
      current.includes(category) ? current.filter((c) => c !== category) : [...current, category]
    );
  }, []);

  const onClearFilters = useCallback(() => {
    setSelectedSeverities([]);
    setSelectedCategories([]);
  }, []);

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
              {i18n.translate(
                'xpack.securitySolution.threatIntelligence.attachments.reportTable.dismissedBadge',
                {
                  defaultMessage: 'Dismissed',
                }
              )}
            </EuiBadge>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="xs" color="subdued">
              {i18n.translate(
                'xpack.securitySolution.threatIntelligence.attachments.reportTable.dismissedBody',
                {
                  defaultMessage:
                    'Report digest for {range} dismissed locally — no server state was changed.',
                  values: { range },
                }
              )}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    );
  }

  return (
    <EuiPanel hasBorder paddingSize="m" data-test-subj="threatIntelReportTableAttachment">
      <EuiTitle size="xs">
        <h4>
          {i18n.translate(
            'xpack.securitySolution.threatIntelligence.attachments.reportTable.title',
            {
              defaultMessage: 'Threat reports',
            }
          )}
        </h4>
      </EuiTitle>
      <EuiText size="xs" color="subdued">
        {range}
      </EuiText>
      <EuiSpacer size="m" />
      <ThreatReportFeed
        items={feedItems}
        selectedSeverities={selectedSeverities}
        selectedCategories={selectedCategories}
        onToggleSeverity={onToggleSeverity}
        onToggleCategory={onToggleCategory}
        onClearFilters={onClearFilters}
        sortBy={sortBy}
        onSortChange={setSortBy}
        emptyMessage={i18n.translate(
          'xpack.securitySolution.threatIntelligence.attachments.reportTable.empty',
          {
            defaultMessage: 'No reports in this digest.',
          }
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
    title: i18n.translate(
      'xpack.securitySolution.threatIntelligence.attachments.reportTable.caseTitle',
      {
        defaultMessage: 'Investigate threat-intel digest ({range})',
        values: { range: data.time_range_label },
      }
    ),
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
      i18n.translate('xpack.securitySolution.threatIntelligence.attachments.reportTable.label', {
        defaultMessage: 'Threat report digest',
      }),
    getIcon: () => 'documents',
    canvasWidth: INTELLIGENCE_HUB_CANVAS_WIDTH,
    renderInlineContent: ({ attachment }) => <ReportTableBody attachment={attachment} />,
    renderCanvasContent: (props) =>
      props.attachment.data.scope ? (
        <React.Suspense
          fallback={
            <EuiFlexGroup alignItems="center" justifyContent="center" css={{ minHeight: 240 }}>
              <EuiFlexItem grow={false}>
                <EuiLoadingSpinner size="l" />
              </EuiFlexItem>
            </EuiFlexGroup>
          }
        >
          <LazyReportTableCanvasContent {...props} />
        </React.Suspense>
      ) : (
        <ReportTableBody attachment={props.attachment} />
      ),
    getActionButtons: ({ attachment, isCanvas, openCanvas }) => {
      const dismissed = readController(attachment.id)?.isDismissed === true;
      if (dismissed) {
        return [
          {
            label: i18n.translate(
              'xpack.securitySolution.threatIntelligence.attachments.reportTable.undoDismissAction',
              { defaultMessage: 'Undo dismiss' }
            ),
            type: ActionButtonType.SECONDARY,
            icon: 'refresh',
            handler: () => readController(attachment.id)?.unhide(),
          },
        ];
      }
      if (isCanvas) {
        return [];
      }
      const hasReports = attachment.data.reports.length > 0;
      const hasScope = attachment.data.scope != null;
      const canvasButton =
        openCanvas && hasScope
          ? [
              {
                label: CANVAS_PREVIEW_LABEL,
                type: ActionButtonType.SECONDARY,
                icon: 'eye',
                handler: openCanvas,
              },
            ]
          : [];
      return [
        ...canvasButton,
        {
          label: i18n.translate(
            'xpack.securitySolution.threatIntelligence.attachments.reportTable.investigateAction',
            { defaultMessage: 'Investigate' }
          ),
          type: ActionButtonType.PRIMARY,
          icon: 'casesApp',
          disabled: !hasReports,
          disabledReason: hasReports
            ? undefined
            : i18n.translate(
                'xpack.securitySolution.threatIntelligence.attachments.reportTable.investigateDisabledReason',
                { defaultMessage: 'Nothing to investigate — the report digest is empty.' }
              ),
          handler: () => handleInvestigate(attachment),
        },
        {
          label: i18n.translate(
            'xpack.securitySolution.threatIntelligence.attachments.reportTable.dismissAction',
            {
              defaultMessage: 'Dismiss',
            }
          ),
          type: ActionButtonType.OVERFLOW,
          icon: 'cross',
          handler: () => handleDismiss(attachment),
        },
      ];
    },
  };
};
