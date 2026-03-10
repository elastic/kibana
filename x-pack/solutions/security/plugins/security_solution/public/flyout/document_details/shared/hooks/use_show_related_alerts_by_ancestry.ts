/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { buildDataTableRecord, type DataTableRecord, type EsHitRecord } from '@kbn/discover-utils';
import { ALERT_ANCESTORS_ID } from '../../../../../common/field_maps/field_names';
import type { GetFieldsData } from './use_get_fields_data';
import type { SearchHit } from '../../../../../common/search_strategy';
import { useIsAnalyzerEnabled } from '../../../../detections/hooks/use_is_analyzer_enabled';
import { useLicense } from '../../../../common/hooks/use_license';
import { getField } from '../utils';

export interface UseShowRelatedAlertsByAncestryParams {
  /**
   * Retrieves searchHit values for the provided field
   */
  getFieldsData: GetFieldsData;
  /**
   * The actual raw document object
   */
  searchHit: SearchHit;
  /**
   * Id of the event document
   */
  eventId: string;
  /**
   * Boolean indicating if the flyout is open in preview
   */
  isRulePreview: boolean;
}

export interface UseShowRelatedAlertsByAncestryResult {
  /**
   * Returns true if the user has at least platinum privilege, and if the document has ancestry data
   */
  show: boolean;
  /**
   * Value of the document id for fetching ancestry alerts
   */
  documentId: string;
}

/**
 * Returns true if the user has at least platinum privilege, and if the document has ancestry data
 */
export const useShowRelatedAlertsByAncestry = ({
  getFieldsData,
  searchHit,
  eventId,
  isRulePreview,
}: UseShowRelatedAlertsByAncestryParams): UseShowRelatedAlertsByAncestryResult => {
  const hit: DataTableRecord = useMemo(
    () => buildDataTableRecord(searchHit as EsHitRecord),
    [searchHit]
  );
  const hasProcessEntityInfo = useIsAnalyzerEnabled(hit);

  const ancestorId = getField(getFieldsData(ALERT_ANCESTORS_ID)) ?? '';
  const documentId = isRulePreview ? ancestorId : eventId;

  const hasAtLeastPlatinum = useLicense().isPlatinumPlus();

  const show = hasProcessEntityInfo && hasAtLeastPlatinum;

  return {
    show,
    documentId,
  };
};
