/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { CellTooltipWrapper } from './cell_tooltip_wrapper';

const TEST_ID = 'test-id';
const children = <p data-test-subj={TEST_ID}>{'test content'}</p>;

describe('<CellTooltipWrapper />', () => {
  it('should render non-expandable panel by default', () => {
    const { getByTestId } = render(
      <CellTooltipWrapper tooltip="test tooltip">{children}</CellTooltipWrapper>
    );
    expect(getByTestId(TEST_ID)).toBeInTheDocument();
  });
});
