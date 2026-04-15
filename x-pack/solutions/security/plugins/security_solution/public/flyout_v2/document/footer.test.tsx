/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { Footer } from './footer';

jest.mock('./components/footer_ai_actions', () => ({
  FooterAiActions: ({ hit }: { hit: DataTableRecord }) => (
    <div data-test-subj="footerAiActions" data-hit-id={hit.id} />
  ),
}));
const mockTakeAction = jest.fn();
jest.mock('./components/take_action', () => ({
  TakeAction: ({ hit, onAlertUpdated }: { hit: DataTableRecord; onAlertUpdated: () => void }) => {
    mockTakeAction({ hit, onAlertUpdated });
    return <div data-test-subj="takeAction" data-hit-id={hit.id} />;
  },
}));

const createMockHit = (): DataTableRecord =>
  ({
    id: 'test-id',
    raw: { _id: 'test-id', _index: 'test-index' },
    flattened: {},
  } as DataTableRecord);

const mockOnAlertUpdated = jest.fn();
const mockOnShowNotes = jest.fn();

describe('<Footer />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders FooterAiActions with the provided hit', () => {
    const hit = createMockHit();

    const { getByTestId } = render(
      <Footer hit={hit} onAlertUpdated={mockOnAlertUpdated} onShowNotes={mockOnShowNotes} />
    );

    const aiActions = getByTestId('footerAiActions');
    expect(aiActions).toBeInTheDocument();
    expect(aiActions).toHaveAttribute('data-hit-id', 'test-id');
  });

  it('renders TakeAction with the provided hit', () => {
    const hit = createMockHit();

    const { getByTestId } = render(
      <Footer hit={hit} onAlertUpdated={mockOnAlertUpdated} onShowNotes={mockOnShowNotes} />
    );

    const aiActions = getByTestId('takeAction');
    expect(aiActions).toBeInTheDocument();
    expect(aiActions).toHaveAttribute('data-hit-id', 'test-id');
  });

  it('passes onAlertUpdated to TakeAction', () => {
    const hit = createMockHit();
    const onAlertUpdated = jest.fn();

    render(<Footer hit={hit} onAlertUpdated={onAlertUpdated} onShowNotes={mockOnShowNotes} />);

    expect(mockTakeAction).toHaveBeenCalledWith(expect.objectContaining({ onAlertUpdated }));
  });
});
