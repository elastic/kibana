/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import { Global, css } from '@emotion/react';
import { JsonCodeEditor } from '@kbn/unified-doc-viewer-plugin/public';
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
    <>
      {/**
       * Sets the height of the tab container (in flyout.tsx) to 100%
       * to allow the json editor to be rendered at full height.
       * Without this, the height of the editor would be 0 and it wouldn't
       * be visible on the page
       */}
      <Global
        styles={css`
          .euiFlyoutBody__overflowContent {
            height: 100%;
          }
        `}
      />
      <JsonCodeEditor
        json={indicator as unknown as Record<string, unknown>}
        hasLineNumbers={true}
        data-test-subj={CODE_BLOCK_TEST_ID}
        height={'100%'}
      />
    </>
  );
};
