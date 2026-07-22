/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { useDocumentFlyoutTitle } from './use_document_flyout_title';
import { useFlyoutApi } from '../../use_flyout_api';
import { FLYOUT_ORIGIN } from '../../../common/lib/telemetry';

jest.mock('../../use_flyout_api');
jest.mock('../../document/main/components/severity', () => ({
  DocumentSeverity: () => <div data-test-subj="documentSeverityMock" />,
}));
jest.mock('../components/timestamp', () => ({
  Timestamp: () => <div data-test-subj="timestampMock" />,
}));

const createHit = (flattened: DataTableRecord['flattened']): DataTableRecord =>
  ({
    id: '1',
    raw: { _id: '1', _index: 'test', _source: {} },
    flattened,
    isAnchor: false,
  } as DataTableRecord);

const alertHit = createHit({
  'event.kind': 'signal',
  'kibana.alert.rule.name': 'My Rule',
});

const eventHit = createHit({
  'event.kind': 'event',
  'event.category': 'host',
  'host.name': 'host-1',
});

describe('useDocumentFlyoutTitle', () => {
  const openDocumentFlyoutFromIndexAsChild = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useFlyoutApi as jest.Mock).mockReturnValue({ openDocumentFlyoutFromIndexAsChild });
  });

  it('derives label and warning icon for alerts', () => {
    const { result } = renderHook(() => useDocumentFlyoutTitle({ hit: alertHit }));

    expect(result.current.label).toBe('My Rule');
    expect(result.current.iconType).toBe('warning');
  });

  it('derives label and analyzeEvent icon for non-alert events', () => {
    const { result } = renderHook(() => useDocumentFlyoutTitle({ hit: eventHit }));

    expect(result.current.label).toBe('host-1');
    expect(result.current.iconType).toBe('analyzeEvent');
  });

  it('opens the source document as a child flyout via openDocumentFlyoutFromIndexAsChild (so it is URL-persisted and reports telemetry)', () => {
    const { result } = renderHook(() => useDocumentFlyoutTitle({ hit: alertHit }));

    act(() => {
      result.current.onTitleClick();
    });

    expect(openDocumentFlyoutFromIndexAsChild).toHaveBeenCalledTimes(1);
    expect(openDocumentFlyoutFromIndexAsChild).toHaveBeenCalledWith(
      expect.objectContaining({
        documentId: '1',
        indexName: 'test',
        origin: FLYOUT_ORIGIN.TOOL_HEADER_TITLE,
      })
    );
  });

  it('returns badge and timestamp nodes derived from the hit', () => {
    const { result } = renderHook(() => useDocumentFlyoutTitle({ hit: alertHit }));

    expect(result.current.badge).toBeTruthy();
    expect(result.current.timestamp).toBeTruthy();
  });
});
