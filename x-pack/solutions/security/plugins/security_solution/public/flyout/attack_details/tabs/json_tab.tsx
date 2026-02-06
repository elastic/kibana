/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';

import { JsonTab as SharedJsonTab } from '../../shared/components/json_tab';
import { useAttackDetailsContext } from '../context';
import { JSON_TAB_TEST_ID } from '../constants/test_ids';

/**
 * Json view displayed in the attack details expandable flyout
 */
export const JsonTab = memo(() => {
  const { searchHit } = useAttackDetailsContext();

  return (
    <SharedJsonTab
      value={searchHit as unknown as Record<string, unknown>}
      showFooterOffset={false}
      data-test-subj={JSON_TAB_TEST_ID}
    />
  );
});

JsonTab.displayName = 'JsonTab';
