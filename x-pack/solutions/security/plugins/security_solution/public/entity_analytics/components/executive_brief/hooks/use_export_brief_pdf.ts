/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import type { ExecutiveBriefJob } from '../../../../../common/entity_analytics/executive_brief/types';
import { useToasts } from '../../../../common/lib/kibana';
import { exportBriefToPdf } from '../export/export_brief_pdf';

/**
 * Hook to handle PDF export of an executive brief.
 * Shows a toast on error.
 */
export const useExportBriefPdf = () => {
  const toasts = useToasts();

  const handleExportPdf = useCallback(
    async (job: ExecutiveBriefJob) => {
      try {
        await exportBriefToPdf(job);
      } catch (err) {
        toasts.addError(err, {
          title: 'Failed to export executive brief PDF',
          toastMessage: err instanceof Error ? err.message : 'An unexpected error occurred.',
        });
      }
    },
    [toasts]
  );

  return handleExportPdf;
};
