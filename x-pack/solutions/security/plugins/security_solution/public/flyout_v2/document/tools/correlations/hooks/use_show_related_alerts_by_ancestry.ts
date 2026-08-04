/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { type DataTableRecord, getFieldValue } from '@kbn/discover-utils';
import { ALERT_ANCESTORS_ID } from '../../../../../../common/field_maps/field_names';
import { useIsAnalyzerEnabled } from '../../../../../detections/hooks/use_is_analyzer_enabled';
import { useLicense } from '../../../../../common/hooks/use_license';
import { isRulePreviewDocument } from '../../../../shared/utils/is_rule_preview_document';

export interface UseShowRelatedAlertsByAncestryParams {
  /**
   * The alert or event document
   */
  hit: DataTableRecord;
}

export interface UseShowRelatedAlertsByAncestryResult {
  /**
   * Returns true if the user has at least platinum privilege, and if the document has ancestry data
   */
  show: boolean;
  /**
   * Value of the document id for fetching ancestry alerts
   */
  ancestryDocumentId: string;
}

/**
 * Returns true if the user has at least platinum privilege, and if the document has ancestry data.
 * For rule preview documents the ancestry document id is the ancestor's id rather than the hit id.
 */
export const useShowRelatedAlertsByAncestry = ({
  hit,
}: UseShowRelatedAlertsByAncestryParams): UseShowRelatedAlertsByAncestryResult => {
  const hasProcessEntityInfo = useIsAnalyzerEnabled(hit);
  const isRulePreview = isRulePreviewDocument(hit);

  const ancestorId = (getFieldValue(hit, ALERT_ANCESTORS_ID) as string) ?? '';
  const ancestryDocumentId = isRulePreview ? ancestorId : hit.raw._id ?? '';

  const hasAtLeastPlatinum = useLicense().isPlatinumPlus();

  const show = hasProcessEntityInfo && hasAtLeastPlatinum;

  return useMemo(
    () => ({
      show,
      ancestryDocumentId,
    }),
    [ancestryDocumentId, show]
  );
};
