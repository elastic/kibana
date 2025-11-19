/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { AI_VALUE_REPORT_LOCATOR } from '@kbn/deeplinks-analytics';
import { useMemo } from 'react';
import { useKibana } from '../../common/lib/kibana';
import type { AIValueReportParams } from '../../../common/locators/ai_value_report/locator';
import { useAIValueExportContext } from '../providers/ai_value/export_provider';

interface UseDownloadAIValueReportParams {
  anchorElement: HTMLElement | null;
  timeRange: AIValueReportParams['timeRange'];
}

export const useDownloadAIValueReport = ({
  anchorElement,
  timeRange,
}: UseDownloadAIValueReportParams) => {
  const { share: shareService, serverless } = useKibana().services;
  const isServerless = !!serverless;
  const aiValueExportContext = useAIValueExportContext();

  const forwardedState = useMemo(() => {
    if (!aiValueExportContext?.buildForwardedState) {
      return undefined;
    }

    return aiValueExportContext.buildForwardedState({ timeRange });
  }, [timeRange, aiValueExportContext]);

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
          title: i18n.translate('xpack.securitySolution.reports.aiValue.pdfReportJobTitle', {
            // TODO confirm what wording we want hre
            defaultMessage: 'AI Value Report',
          }),
          locatorParams: {
            id: AI_VALUE_REPORT_LOCATOR,
            params: forwardedState,
          },
        },
      });
    };
  }, [anchorElement, shareService, forwardedState, isExportEnabled]);

  return {
    toggleContextMenu,
    isExportEnabled,
  };
};
