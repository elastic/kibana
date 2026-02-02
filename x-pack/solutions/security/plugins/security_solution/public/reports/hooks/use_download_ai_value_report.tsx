/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { AI_VALUE_REPORT_LOCATOR } from '@kbn/deeplinks-analytics';
import { SECURITY_SOLUTION_DEFAULT_VALUE_REPORT_TITLE } from '@kbn/management-settings-ids';
import { useMemo } from 'react';
import { useKibana } from '../../common/lib/kibana';
import type { AIValueReportParams } from '../../../common/locators/ai_value_report/locator';
import type { TimeRange } from '../../common/store/inputs/model';
import { useAIValueExportContext } from '../providers/ai_value/export_provider';

interface UseDownloadAIValueReportParams {
  anchorElement: HTMLElement | null;
  timeRange: TimeRange;
}

export const useDownloadAIValueReport = ({
  anchorElement,
  timeRange,
}: UseDownloadAIValueReportParams) => {
  const { share: shareService, serverless, uiSettings } = useKibana().services;
  const isServerless = !!serverless;
  const aiValueExportContext = useAIValueExportContext();
  const buildForwardedState = aiValueExportContext?.buildForwardedState;

  const forwardedTimeRange: AIValueReportParams['timeRange'] = useMemo(() => {
    if (timeRange.kind === 'relative') {
      return { kind: 'relative', fromStr: timeRange.fromStr, toStr: timeRange.toStr };
    }

    return { kind: 'absolute', from: timeRange.from, to: timeRange.to };
  }, [timeRange]);

  const forwardedState = useMemo(() => {
    if (!buildForwardedState) {
      return undefined;
    }

    return buildForwardedState({ timeRange: forwardedTimeRange });
  }, [forwardedTimeRange, buildForwardedState]);

  const isExportEnabled =
    forwardedState !== undefined &&
    // exporting the report via the share service is only available in ESS
    !isServerless &&
    anchorElement !== null &&
    shareService !== undefined;

  const toggleContextMenu = useMemo(() => {
    if (!isExportEnabled) {
      return () => {};
    }

    return () => {
      const reportTitle =
        uiSettings?.get<string>(SECURITY_SOLUTION_DEFAULT_VALUE_REPORT_TITLE) ??
        i18n.translate('xpack.securitySolution.reports.aiValue.pdfReportJobTitle', {
          defaultMessage: 'AI Value Report',
        });
      shareService.toggleShareContextMenu({
        isDirty: false,
        anchorElement,
        allowShortUrl: false,
        asExport: true,
        objectType: 'ai_value_report',
        objectTypeMeta: {
          title: i18n.translate('xpack.securitySolution.reports.aiValue.shareModal.title', {
            defaultMessage: 'Download this report',
          }),
          config: {
            integration: {
              export: {
                pdfReports: {},
              },
            },
          },
        },
        sharingData: {
          title: reportTitle,
          locatorParams: {
            id: AI_VALUE_REPORT_LOCATOR,
            params: forwardedState,
          },
        },
      });
    };
  }, [anchorElement, shareService, forwardedState, isExportEnabled, uiSettings]);

  return {
    toggleContextMenu,
    isExportEnabled,
  };
};
