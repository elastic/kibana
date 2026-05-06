/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';

import { EuiPanel } from '@elastic/eui';
import type { ResponseDetailsContentProps } from './response_details';
import { ResponseDetailsContent } from './response_details';
import { RESPONSE_TAB_CONTENT_TEST_ID } from './test_ids';

export type ResponseTabProps = ResponseDetailsContentProps;

/**
 * Response tab content displayed in the legacy expandable flyout left panel.
 */
export const ResponseTab = memo<ResponseTabProps>(({ hit, isRulePreview }) => (
  <EuiPanel data-test-subj={RESPONSE_TAB_CONTENT_TEST_ID} hasShadow={false}>
    <ResponseDetailsContent hit={hit} isRulePreview={isRulePreview} />
  </EuiPanel>
));

ResponseTab.displayName = 'ResponseTab';
