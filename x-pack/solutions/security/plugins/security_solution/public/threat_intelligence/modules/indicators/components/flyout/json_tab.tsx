/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import { EuiCodeBlock } from '@elastic/eui';
import type { Indicator } from '../../../../../../common/threat_intelligence/types/indicator';
import { IndicatorEmptyPrompt } from './empty_prompt';
import { CODE_BLOCK_TEST_ID } from './test_ids';

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
    <EuiCodeBlock language="json" lineNumbers data-test-subj={CODE_BLOCK_TEST_ID}>
      {JSON.stringify(indicator, null, 2)}
    </EuiCodeBlock>
  );
};
