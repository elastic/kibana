/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { buildDataTableRecord } from '@kbn/discover-utils';
import { AISummarySection } from './ai_summary_section';
import { useAttackDetailsContext } from '../context';

jest.mock('../context', () => ({
  useAttackDetailsContext: jest.fn(),
}));

jest.mock('@kbn/discover-utils', () => ({
  buildDataTableRecord: jest.fn(),
}));

jest.mock('../../../flyout_v2/attack/main/components/ai_summary_section', () => ({
  AISummarySection: ({ hit }: { hit: DataTableRecord }) => (
    <div data-test-subj="v2-ai-summary-section" data-hit-id={(hit as DataTableRecord).id} />
  ),
}));

const mockedUseAttackDetailsContext = jest.mocked(useAttackDetailsContext);
const mockedBuildDataTableRecord = jest.mocked(buildDataTableRecord);

const mockSearchHit = { _id: 'attack-1', _index: '.alerts-test', _source: {} };
const mockHit = {
  id: 'attack-1',
  raw: mockSearchHit,
  flattened: {},
} as unknown as DataTableRecord;

describe('AISummarySection (legacy bridge)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseAttackDetailsContext.mockReturnValue({
      searchHit: mockSearchHit,
    } as ReturnType<typeof useAttackDetailsContext>);
    mockedBuildDataTableRecord.mockReturnValue(mockHit);
  });

  it('renders the v2 AISummarySection', () => {
    render(<AISummarySection />);
    expect(screen.getByTestId('v2-ai-summary-section')).toBeInTheDocument();
  });

  it('builds a DataTableRecord from the context searchHit', () => {
    render(<AISummarySection />);
    expect(mockedBuildDataTableRecord).toHaveBeenCalledWith(mockSearchHit);
  });

  it('passes the built hit to the v2 component', () => {
    render(<AISummarySection />);
    expect(screen.getByTestId('v2-ai-summary-section')).toHaveAttribute(
      'data-hit-id',
      'attack-1'
    );
  });
});
