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
import { TestProviders } from '../../../../common/mock';
import { ResponseDetails } from '.';
import { ResponseDetailsContent } from './components/response_details';

vi.mock('../../../shared/components/tools_flyout_header', () => {
      const mocked = {
      ToolsFlyoutHeader: ({ title }: { title: string }) => (
        <div data-test-subj="toolsFlyoutHeaderMock">{title}</div>
      ),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./components/response_details', () => {
      const mocked = {
      ResponseDetailsContent: vi.fn(() => <div data-test-subj="responseDetailsContentMock" />),
    };
      return { ...mocked, default: mocked };
    });

const hit = {
  id: '1',
  raw: { _id: 'event-id', _index: 'event-index', _source: {} },
  flattened: { 'event.kind': 'signal' },
  isAnchor: false,
} as DataTableRecord;

describe('<ResponseDetails />', () => {
  const mockResponseDetailsContent = vi.mocked(ResponseDetailsContent);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders response details content with the provided hit', () => {
    const { getByTestId } = render(
      <TestProviders>
        <ResponseDetails hit={hit} />
      </TestProviders>
    );

    expect(getByTestId('responseDetailsContentMock')).toBeInTheDocument();
    expect(mockResponseDetailsContent).toHaveBeenCalledWith(
      {
        hit,
      },
      {}
    );
  });
});
