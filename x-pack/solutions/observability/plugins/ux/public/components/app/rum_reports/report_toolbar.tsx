/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiSwitch } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import {
  csvFilename,
  reportPrimaryCsv,
  scorecardMarkdown,
  type RumReportResponse,
} from '../../../../common/rum_report';
import { useKibanaServices } from '../../../hooks/use_kibana_services';
import { mergeRumSearch } from '../../../utils/rum_search';
import { exportReportPdf } from './export_report_pdf';
import { UxTourAnchor } from '../rum_tour/ux_tour_anchor';

const downloadCsv = (filename: string, csv: string) => {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

export function ReportToolbar({
  report,
  includePii,
  exactStart,
  exactEnd,
  onGenerateAi,
  onScheduleEmail,
  onCreateAlert,
  captureRoot,
}: {
  report: RumReportResponse;
  includePii: boolean;
  exactStart?: string;
  exactEnd?: string;
  onGenerateAi?: () => void;
  onScheduleEmail?: () => void;
  onCreateAlert?: () => void;
  captureRoot?: { current: HTMLElement | null };
}) {
  const { http, notifications } = useKibanaServices();
  const history = useHistory();
  const location = useLocation();
  const [exporting, setExporting] = useState(false);

  const absoluteUrl = useCallback(
    (mode: 'snapshot' | 'live') => {
      const search =
        mode === 'snapshot'
          ? mergeRumSearch(location.search, {
              rangeFrom: exactStart || report.rangeFrom,
              rangeTo: exactEnd || report.rangeTo,
              compare: report.compareFrom ? 'previous' : 'none',
              includePii: includePii ? 'true' : '',
            })
          : mergeRumSearch(location.search, {
              compare: report.compareFrom ? 'previous' : 'none',
              includePii: includePii ? 'true' : '',
            });
      const path = http.basePath.prepend(`/app/ux${location.pathname}`);
      return `${window.location.origin}${path}${search ? `?${search}` : ''}`;
    },
    [
      exactEnd,
      exactStart,
      http.basePath,
      includePii,
      location.pathname,
      location.search,
      report.compareFrom,
      report.rangeFrom,
      report.rangeTo,
    ]
  );

  const copyUrl = async (mode: 'snapshot' | 'live') => {
    const url = absoluteUrl(mode);
    await navigator.clipboard.writeText(url);
    notifications.toasts.addSuccess(
      mode === 'snapshot'
        ? i18n.translate('xpack.ux.reports.toolbar.copiedSnapshotTitle', {
            defaultMessage: 'Copied snapshot URL',
          })
        : i18n.translate('xpack.ux.reports.toolbar.copiedLiveTitle', {
            defaultMessage: 'Copied live URL',
          })
    );
  };

  const copyMarkdown = async () => {
    if (report.templateId !== 'scorecard') {
      await navigator.clipboard.writeText(absoluteUrl('snapshot'));
      notifications.toasts.addSuccess(
        i18n.translate('xpack.ux.reports.toolbar.copiedUrlTitle', {
          defaultMessage: 'Copied report URL',
        })
      );
      return;
    }
    await navigator.clipboard.writeText(scorecardMarkdown(report, absoluteUrl('snapshot')));
    notifications.toasts.addSuccess(
      i18n.translate('xpack.ux.reports.toolbar.copiedMarkdownTitle', {
        defaultMessage: 'Copied Slack markdown',
      })
    );
  };

  return (
    <div className="uxRumReportNoPrint">
      <EuiFlexGroup gutterSize="s" alignItems="center" wrap>
        <EuiFlexItem grow={false}>
          <EuiButton
            data-test-subj="uxReportCopySnapshot"
            fill
            iconType="link"
            onClick={() => void copyUrl('snapshot')}
          >
            {i18n.translate('xpack.ux.reports.toolbar.copySnapshotButtonLabel', {
              defaultMessage: 'Copy snapshot URL',
            })}
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            data-test-subj="uxReportCopyLive"
            iconType="refresh"
            onClick={() => void copyUrl('live')}
          >
            {i18n.translate('xpack.ux.reports.toolbar.copyLiveButtonLabel', {
              defaultMessage: 'Copy live URL',
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            data-test-subj="uxReportPrint"
            iconType="document"
            isLoading={exporting}
            onClick={() => {
              const root = captureRoot?.current;
              if (!root) {
                window.print();
                return;
              }
              setExporting(true);
              const filename = csvFilename(
                report.templateId,
                report.rangeFrom,
                report.rangeTo
              ).replace(/\.csv$/i, '.pdf');
              void exportReportPdf(root, filename)
                .then(() => {
                  notifications.toasts.addSuccess(
                    i18n.translate('xpack.ux.reports.toolbar.pdfReadyTitle', {
                      defaultMessage: 'PDF downloaded',
                    })
                  );
                })
                .catch((err: Error) => {
                  notifications.toasts.addError(err, {
                    title: i18n.translate('xpack.ux.reports.toolbar.pdfFailedTitle', {
                      defaultMessage: 'Unable to export PDF',
                    }),
                  });
                })
                .finally(() => {
                  setExporting(false);
                });
            }}
          >
            {i18n.translate('xpack.ux.reports.toolbar.printButtonLabel', {
              defaultMessage: 'Export PDF',
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            data-test-subj="uxReportCsv"
            iconType="download"
            onClick={() =>
              downloadCsv(
                csvFilename(report.templateId, report.rangeFrom, report.rangeTo),
                reportPrimaryCsv(report)
              )
            }
          >
            {i18n.translate('xpack.ux.reports.toolbar.csvButtonLabel', {
              defaultMessage: 'Download CSV',
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            data-test-subj="uxReportMarkdown"
            iconType="comment"
            onClick={() => void copyMarkdown()}
          >
            {i18n.translate('xpack.ux.reports.toolbar.markdownButtonLabel', {
              defaultMessage: 'Copy markdown',
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
        {onGenerateAi && (
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              data-test-subj="uxReportAiOpen"
              iconType="sparkles"
              onClick={onGenerateAi}
            >
              {i18n.translate('xpack.ux.reports.toolbar.aiNarrativeButtonLabel', {
                defaultMessage: 'Generate AI narrative',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
        )}
        {onScheduleEmail && (
          <EuiFlexItem grow={false}>
            <UxTourAnchor stepId="scheduleEmail">
              <EuiButtonEmpty
                data-test-subj="uxReportScheduleEmail"
                iconType="mail"
                onClick={onScheduleEmail}
              >
                {i18n.translate('xpack.ux.reports.toolbar.scheduleEmailButtonLabel', {
                  defaultMessage: 'Schedule email',
                })}
              </EuiButtonEmpty>
            </UxTourAnchor>
          </EuiFlexItem>
        )}
        {onCreateAlert && (
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              data-test-subj="uxReportCreateAlert"
              iconType="bell"
              onClick={onCreateAlert}
            >
              {i18n.translate('xpack.ux.reports.toolbar.createAlertButtonLabel', {
                defaultMessage: 'Create alert',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
        )}
        <EuiFlexItem grow={false}>
          <EuiSwitch
            data-test-subj="uxReportIncludePii"
            label={i18n.translate('xpack.ux.reports.toolbar.includePiiToggleSwitch', {
              defaultMessage: 'Include PII',
            })}
            checked={includePii}
            onChange={(event) => {
              history.push({
                ...location,
                search: mergeRumSearch(location.search, {
                  includePii: event.target.checked ? 'true' : '',
                }),
              });
            }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
}
