/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { renderHook } from '@testing-library/react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { DOC_VIEWER_FLYOUT_HISTORY_KEY } from '@kbn/unified-doc-viewer';
import { useSharedToolsFlyoutApi } from './use_shared_tools_flyout_api';
import { useKibana } from '../../../common/lib/kibana';
import { useIsInSecurityApp } from '../../../common/hooks/is_in_security_app';
import { flyoutProviders } from '../components/flyout_provider';
import { documentFlyoutHistoryKey } from '../constants/flyout_history';
import { FLYOUT_DESCRIPTOR_KIND } from '../url_state/flyout_v2_url_param';

vi.mock('react-redux-v7', () => {
  const mocked = {
    ...require('react-redux-v7'),
    useStore: vi.fn(() => ({})),
  };
  return { ...mocked, default: mocked };
});
vi.mock('react-router-dom', () => {
  const mocked = {
    ...require('react-router-dom'),
    useHistory: vi.fn(() => ({})),
  };
  return { ...mocked, default: mocked };
});
vi.mock('../../../common/lib/kibana');
vi.mock('../../../common/hooks/is_in_security_app');
vi.mock('../components/flyout_provider', () => {
  const mocked = {
    flyoutProviders: vi.fn(() => 'FLYOUT_CONTENT'),
  };
  return { ...mocked, default: mocked };
});
vi.mock('../hooks/use_default_flyout_properties', () => {
  const mocked = {
    useDefaultToolsFlyoutProperties: vi.fn(() => ({ minWidth: 384, size: 'm' })),
  };
  return { ...mocked, default: mocked };
});

const mockWriteOnOpen = vi.fn();
const mockBuildOnClose = vi.fn(() => vi.fn());
vi.mock('../url_state/flyout_v2_url_writer', () => {
  const mocked = {
    useFlyoutV2UrlWriter: vi.fn(() => ({
      writeOnOpen: mockWriteOnOpen,
      buildOnClose: mockBuildOnClose,
    })),
  };
  return { ...mocked, default: mocked };
});

const mockOpenSystemFlyout = vi.fn();
const hit = {
  id: '1',
  raw: { _id: 'doc-id', _index: 'doc-index' },
  flattened: {},
} as unknown as DataTableRecord;

describe('useSharedToolsFlyoutApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOpenSystemFlyout.mockReturnValue({ onClose: Promise.resolve(), close: vi.fn() });
    (useKibana as Mock).mockReturnValue({
      services: {
        overlays: { openSystemFlyout: mockOpenSystemFlyout },
        storage: { get: vi.fn(), set: vi.fn(), remove: vi.fn() },
        telemetry: { reportEvent: vi.fn() },
      },
    });
    (useIsInSecurityApp as Mock).mockReturnValue(true);
  });

  const getProperties = () => mockOpenSystemFlyout.mock.calls[0][1];

  it('openNotes opens a tools flyout as a new tools session', () => {
    const { result } = renderHook(() => useSharedToolsFlyoutApi());
    result.current.openNotes({ hit });

    expect(flyoutProviders).toHaveBeenCalledTimes(1);
    expect(mockOpenSystemFlyout).toHaveBeenCalledWith(
      'FLYOUT_CONTENT',
      expect.objectContaining({ size: 'm', historyKey: documentFlyoutHistoryKey })
    );
    expect(getProperties().session).toBe('start');
  });

  it('openNotes sets a title derived from the document', () => {
    const { result } = renderHook(() => useSharedToolsFlyoutApi());
    result.current.openNotes({ hit });

    // hit has no event.kind=signal, so getDocumentHistoryTitle falls back to getDocumentTitle
    // which for a minimal record produces a non-empty string; the important thing is that
    // a title is always set (never undefined → never "Unknown Flyout").
    expect(getProperties().title).toBeDefined();
    expect(typeof getProperties().title).toBe('string');
  });

  it('uses the doc-viewer history key when outside the security app', () => {
    (useIsInSecurityApp as Mock).mockReturnValue(false);
    const { result } = renderHook(() => useSharedToolsFlyoutApi());
    result.current.openNotes({ hit });

    expect(getProperties().historyKey).toBe(DOC_VIEWER_FLYOUT_HISTORY_KEY);
  });

  it('openNotes writes a notes descriptor with document ids from the hit', () => {
    const { result } = renderHook(() => useSharedToolsFlyoutApi());
    result.current.openNotes({ hit });

    expect(mockWriteOnOpen).toHaveBeenCalledWith({
      kind: FLYOUT_DESCRIPTOR_KIND.notes,
      documentId: 'doc-id',
      indexName: 'doc-index',
    });
  });

  it('openNotes clears the param on close (tool is a session:start root)', () => {
    mockBuildOnClose.mockReturnValue(vi.fn());
    const { result } = renderHook(() => useSharedToolsFlyoutApi());
    result.current.openNotes({ hit });

    // A tool is a session:'start' root; closing it clears the param (no parent to revert to).
    expect(mockBuildOnClose).toHaveBeenCalledWith(null);
    expect(getProperties().onClose).toBeDefined();
  });
});
