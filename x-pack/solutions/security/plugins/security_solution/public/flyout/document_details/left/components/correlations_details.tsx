/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { buildDataTableRecord, type EsHitRecord } from '@kbn/discover-utils';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { useDocumentDetailsContext } from '../../shared/context';
import { CorrelationsDetails as CorrelationsDetailsV2 } from '../../../../flyout_v2/correlations';
import { DocumentDetailsPreviewPanelKey } from '../../shared/constants/panel_keys';
import { ALERT_PREVIEW_BANNER } from '../../preview/constants';

export const CORRELATIONS_TAB_ID = 'correlations';

/**
 * Correlations displayed in the document details expandable flyout left section under the Insights tab
 */
export const CorrelationsDetails: React.FC = () => {
  const { scopeId, isRulePreview, searchHit } = useDocumentDetailsContext();
  const { openPreviewPanel } = useExpandableFlyoutApi();

  const onShowAlert = useCallback(
    (id: string, indexName: string) =>
      openPreviewPanel({
        id: DocumentDetailsPreviewPanelKey,
        params: { id, indexName, scopeId, isPreviewMode: true, banner: ALERT_PREVIEW_BANNER },
      }),
    [openPreviewPanel, scopeId]
  );

  const hit = useMemo(() => buildDataTableRecord(searchHit as EsHitRecord), [searchHit]);

  return (
    <CorrelationsDetailsV2
      hit={hit}
      scopeId={scopeId}
      isRulePreview={isRulePreview}
      onShowAlert={onShowAlert}
      hidePreviewLink={false}
    />
  );
};

CorrelationsDetails.displayName = 'CorrelationsDetails';
