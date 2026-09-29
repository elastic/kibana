/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import { render } from '@testing-library/react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { DocumentToolsFlyoutHeader } from './document_tools_flyout_header';
import { useDocumentFlyoutTitle } from '../hooks/use_document_flyout_title';

vi.mock('../hooks/use_document_flyout_title');

const mockToolsFlyoutHeaderProps = vi.fn();
vi.mock('./tools_flyout_header', () => {
  const mocked = {
    ToolsFlyoutHeader: (props: Record<string, unknown>) => {
      mockToolsFlyoutHeaderProps(props);
      return <div data-test-subj="mockToolsFlyoutHeader" />;
    },
  };
  return { ...mocked, default: mocked };
});

const useDocumentFlyoutTitleMock = useDocumentFlyoutTitle as Mock;

const hit = { id: '1', raw: {}, flattened: {} } as unknown as DataTableRecord;

const onTitleClick = vi.fn();
const badge = <div data-test-subj="mockBadge" />;
const timestamp = <div data-test-subj="mockTimestamp" />;

const titleResult = {
  label: 'Test Rule',
  iconType: 'warning',
  onTitleClick,
  badge,
  timestamp,
};

describe('<DocumentToolsFlyoutHeader />', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useDocumentFlyoutTitleMock.mockReturnValue(titleResult);
  });

  it('renders the ToolsFlyoutHeader', () => {
    const { getByTestId } = render(
      <DocumentToolsFlyoutHeader title={<span>{'Correlations'}</span>} hit={hit} />
    );
    expect(getByTestId('mockToolsFlyoutHeader')).toBeInTheDocument();
  });

  it('forwards the title and the values computed by useDocumentFlyoutTitle to ToolsFlyoutHeader', () => {
    const title = <span>{'Correlations'}</span>;
    render(<DocumentToolsFlyoutHeader title={title} hit={hit} />);

    expect(mockToolsFlyoutHeaderProps).toHaveBeenCalledWith(
      expect.objectContaining({
        title,
        label: 'Test Rule',
        iconType: 'warning',
        onTitleClick,
        badge,
        timestamp,
      })
    );
  });

  it('passes hit, renderCellActions and onAlertUpdated to useDocumentFlyoutTitle', () => {
    const renderCellActions = vi.fn();
    const onAlertUpdated = vi.fn();

    render(
      <DocumentToolsFlyoutHeader
        title={<span>{'Correlations'}</span>}
        hit={hit}
        renderCellActions={renderCellActions}
        onAlertUpdated={onAlertUpdated}
      />
    );

    expect(useDocumentFlyoutTitleMock).toHaveBeenCalledWith({
      hit,
      renderCellActions,
      onAlertUpdated,
    });
  });
});
