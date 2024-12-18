/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';

import { EuiPanel } from '@elastic/eui';
import { ResponseDetails } from '../components/response_details';
import { RESPONSE_TAB_CONTENT_TEST_ID } from './test_ids';

/**
 * Response view displayed in the document details expandable flyout left section
 */
export const ResponseTab = memo(() => {
  return (
    <EuiPanel data-test-subj={RESPONSE_TAB_CONTENT_TEST_ID} hasShadow={false}>
      <ResponseDetails />
    </EuiPanel>
  );
});

ResponseTab.displayName = 'ResponseTab';
