/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import { render } from '@testing-library/react';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { CorrelationsDetails } from './correlations_details';
import { TestProviders } from '../../../../common/mock';
import { DocumentDetailsContext } from '../../shared/context';
import { mockContextValue } from '../../shared/mocks/mock_context';
import type { CorrelationsDetailsProps } from '../../../../flyout_v2/document/tools/correlations';

vi.mock('@kbn/expandable-flyout');

vi.mock(
  '../../../../flyout_v2/document/tools/correlations/components/correlations_details_view',
  () => {
    const mocked = {
      CorrelationsDetailsView: ({ scopeId, onShowAttack }: CorrelationsDetailsProps) => (
        <div
          data-test-subj="correlationsDetailsV2Mock"
          data-scope-id={scopeId}
          data-has-on-show-attack={String(typeof onShowAttack === 'function')}
        />
      ),
    };
    return { ...mocked, default: mocked };
  }
);

const renderCorrelationDetails = () =>
  render(
    <TestProviders>
      <DocumentDetailsContext.Provider value={mockContextValue}>
        <CorrelationsDetails />
      </DocumentDetailsContext.Provider>
    </TestProviders>
  );

describe('CorrelationsDetails', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useExpandableFlyoutApi).mockReturnValue({
      openPreviewPanel: vi.fn(),
    } as unknown as ReturnType<typeof useExpandableFlyoutApi>);
  });

  it('renders CorrelationsDetailsV2 with props derived from context', () => {
    const { getByTestId } = renderCorrelationDetails();

    const el = getByTestId('correlationsDetailsV2Mock');
    expect(el).toBeInTheDocument();
    expect(el).toHaveAttribute('data-scope-id', mockContextValue.scopeId);
  });

  it('passes onShowAttack callback to CorrelationsDetailsV2', () => {
    const { getByTestId } = renderCorrelationDetails();

    expect(getByTestId('correlationsDetailsV2Mock')).toHaveAttribute(
      'data-has-on-show-attack',
      'true'
    );
  });
});
