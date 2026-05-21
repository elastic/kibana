/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { buildDataTableRecord, type EsHitRecord } from '@kbn/discover-utils';
import { LeftPanelResponseTab } from '../../left';
import { useDocumentDetailsContext } from '../../shared/context';
import { useNavigateToLeftPanel } from '../../shared/hooks/use_navigate_to_left_panel';
import { ResponseSectionContent } from '../../../../flyout_v2/document/main/components/response_section_content';

/**
 * Response section adapter for the legacy expandable flyout overview tab.
 */
export const ResponseSection = memo(() => {
  const { isRulePreview, searchHit } = useDocumentDetailsContext();
  const goToResponseTab = useNavigateToLeftPanel({
    tab: LeftPanelResponseTab,
  });
  const hit = useMemo(() => buildDataTableRecord(searchHit as EsHitRecord), [searchHit]);

  return (
    <ResponseSectionContent
      hit={hit}
      isRulePreview={isRulePreview}
      onShowResponseDetails={goToResponseTab}
    />
  );
});

ResponseSection.displayName = 'ResponseSection';
