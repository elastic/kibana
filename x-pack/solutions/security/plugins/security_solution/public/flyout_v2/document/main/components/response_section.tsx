/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { type DataTableRecord } from '@kbn/discover-utils';
import { useFlyoutApi } from '../../../use_flyout_api';
import { ResponseSectionContent } from './response_section_content';
import { FLYOUT_ORIGIN } from '../../../../common/lib/telemetry';

export interface ResponseSectionProps {
  /**
   * Document to display in the overview tab.
   */
  hit: DataTableRecord;
  /**
   * Whether the flyout is opened in rule preview mode.
   */
  isRulePreview?: boolean;
}

/**
 * Most bottom section of the overview tab. It contains a summary of the response tab.
 * Constructs the v2 tools flyout callback and forwards rendering to {@link ResponseSectionContent}.
 */
export const ResponseSection = memo<ResponseSectionProps>(({ hit, isRulePreview = false }) => {
  const { openDocumentResponse } = useFlyoutApi();

  const onShowResponseDetails = useCallback(() => {
    openDocumentResponse({ hit, origin: FLYOUT_ORIGIN.RESPONSE_SECTION });
  }, [openDocumentResponse, hit]);

  return (
    <ResponseSectionContent
      hit={hit}
      isRulePreview={isRulePreview}
      onShowResponseDetails={onShowResponseDetails}
    />
  );
});

ResponseSection.displayName = 'ResponseSection';
