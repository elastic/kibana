/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import type { Indicator } from '../../../../../../common/threat_intelligence/types/indicator';
import { IndicatorEmptyPrompt } from './empty_prompt';
import { JsonTab } from '../../../../../flyout/shared/components/json_tab';

export const FLYOUT_JSON_TEST_ID = 'indicators-flyout';

export interface IndicatorsFlyoutJsonProps {
  /**
   * Indicator to display in json format.
   */
  indicator: Indicator;
}

/**
 * Displays all the properties and values of an {@link Indicator} in json view,
 * using the {@link EuiCodeBlock} from the @elastic/eui library.
 */
export const IndicatorsFlyoutJson: FC<IndicatorsFlyoutJsonProps> = ({ indicator }) => {
  return Object.keys(indicator).length === 0 ? (
    <IndicatorEmptyPrompt />
  ) : (
    <JsonTab
      value={indicator as unknown as Record<string, unknown>}
      showFooterOffset={false}
      data-test-subj={FLYOUT_JSON_TEST_ID}
    />
  );
};
