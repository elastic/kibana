/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { useDocumentDetailsContext } from '../../shared/context';
import { JsonTab as SharedJsonTab } from '../../../shared/components/json_tab';
import { PREFIX } from '../../../shared/test_ids';

/**
 * Json view displayed in the document details expandable flyout right section
 */
export const JsonTab = memo(() => {
  const { searchHit, isRulePreview } = useDocumentDetailsContext();

  return (
    <SharedJsonTab
      value={searchHit as unknown as Record<string, unknown>}
      showFooterOffset={isRulePreview}
      data-test-subj={PREFIX}
    />
  );
});

JsonTab.displayName = 'JsonTab';
