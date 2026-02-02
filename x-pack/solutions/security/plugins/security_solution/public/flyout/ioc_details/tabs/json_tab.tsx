/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { useIOCDetailsContext } from '../context';
import { JsonTab as SharedJsonTab } from '../../shared/components/json_tab';
import { IndicatorEmptyPrompt } from '../components/empty_prompt';

export const FLYOUT_JSON_TEST_ID = 'indicators-flyout';

/**
 * Displays all the properties and values of an {@link Indicator} in json view,
 * using the {@link EuiCodeBlock} from the @elastic/eui library.
 */
export const JsonTab = memo(() => {
  const { indicator } = useIOCDetailsContext();

  return Object.keys(indicator).length === 0 ? (
    <IndicatorEmptyPrompt />
  ) : (
    <SharedJsonTab
      value={indicator as unknown as Record<string, unknown>}
      showFooterOffset={false}
      data-test-subj={FLYOUT_JSON_TEST_ID}
    />
  );
});

JsonTab.displayName = 'JsonTab';
