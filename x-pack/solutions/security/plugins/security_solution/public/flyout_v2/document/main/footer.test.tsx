/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import { render } from '@testing-library/react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { Footer } from './footer';

vi.mock('./components/footer_ai_actions', () => {
  const mocked = {
    FooterAiActions: ({ hit }: { hit: DataTableRecord }) => (
      <div data-test-subj="footerAiActions" data-hit-id={hit.id} />
    ),
  };
  return { ...mocked, default: mocked };
});
const mockTakeAction = vi.fn();
vi.mock('./components/take_action', () => {
  const mocked = {
    TakeAction: ({ hit, onAlertUpdated }: { hit: DataTableRecord; onAlertUpdated: () => void }) => {
      mockTakeAction({ hit, onAlertUpdated });
      return <div data-test-subj="takeAction" data-hit-id={hit.id} />;
    },
  };
  return { ...mocked, default: mocked };
});

const createMockHit = (): DataTableRecord =>
  ({
    id: 'test-id',
    raw: { _id: 'test-id', _index: 'test-index' },
    flattened: {},
  } as DataTableRecord);

const mockOnAlertUpdated = vi.fn();
const mockOnShowNotes = vi.fn();

describe('<Footer />', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    const onAlertUpdated = vi.fn();

    render(<Footer hit={hit} onAlertUpdated={onAlertUpdated} onShowNotes={mockOnShowNotes} />);

    expect(mockTakeAction).toHaveBeenCalledWith(expect.objectContaining({ onAlertUpdated }));
  });
});
