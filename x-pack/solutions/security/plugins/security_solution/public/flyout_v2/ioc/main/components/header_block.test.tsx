/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { HeaderBlock, HEADER_BLOCK_TEST_ID, HEADER_BLOCK_ITEM_TEST_ID } from './header_block';
import {
  generateMockIndicator,
  RawIndicatorFieldId,
} from '../../../../../common/threat_intelligence/types/indicator';
import { TestProviders } from '../../../../common/mock';
import { noopCellActionRenderer } from '../../../shared/components/cell_actions';

describe('HeaderBlock', () => {
  const indicator = generateMockIndicator();

  it('should render with the correct test id for the given field', () => {
    const field = RawIndicatorFieldId.Feed;
    const { getByTestId } = render(
      <TestProviders>
        <HeaderBlock
          indicator={indicator}
          field={field}
          renderCellActions={noopCellActionRenderer}
        />
      </TestProviders>
    );

    expect(getByTestId(`${HEADER_BLOCK_TEST_ID}-${field}`)).toBeInTheDocument();
    expect(getByTestId(HEADER_BLOCK_ITEM_TEST_ID)).toBeInTheDocument();
  });

  it('should render for each high level field', () => {
    const fields = [
      RawIndicatorFieldId.Feed,
      RawIndicatorFieldId.Type,
      RawIndicatorFieldId.MarkingTLP,
      RawIndicatorFieldId.Confidence,
    ];

    for (const field of fields) {
      const { getByTestId } = render(
        <TestProviders>
          <HeaderBlock
            indicator={indicator}
            field={field}
            renderCellActions={noopCellActionRenderer}
          />
        </TestProviders>
      );

      expect(getByTestId(`${HEADER_BLOCK_TEST_ID}-${field}`)).toBeInTheDocument();
    }
  });
});
