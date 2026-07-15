/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { DOC_VIEWER_FLYOUT_HISTORY_KEY } from '@kbn/unified-doc-viewer';
import { useSharedToolsFlyoutApi } from './use_shared_tools_flyout_api';
import { useKibana } from '../../../common/lib/kibana';
import { useIsInSecurityApp } from '../../../common/hooks/is_in_security_app';
import { flyoutProviders } from '../components/flyout_provider';
import { documentFlyoutHistoryKey } from '../constants/flyout_history';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useStore: jest.fn(() => ({})),
}));
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useHistory: jest.fn(() => ({})),
}));
jest.mock('../../../common/lib/kibana');
jest.mock('../../../common/hooks/is_in_security_app');
jest.mock('../components/flyout_provider', () => ({
  flyoutProviders: jest.fn(() => 'FLYOUT_CONTENT'),
}));
jest.mock('../hooks/use_default_flyout_properties', () => ({
  defaultToolsFlyoutProperties: { size: 'm' },
}));

const mockOpenSystemFlyout = jest.fn();
const hit = { id: '1', raw: { _id: '1' }, flattened: {} } as unknown as DataTableRecord;

describe('useSharedToolsFlyoutApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useKibana as jest.Mock).mockReturnValue({
      services: { overlays: { openSystemFlyout: mockOpenSystemFlyout } },
    });
    (useIsInSecurityApp as jest.Mock).mockReturnValue(true);
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

  it('uses the doc-viewer history key when outside the security app', () => {
    (useIsInSecurityApp as jest.Mock).mockReturnValue(false);
    const { result } = renderHook(() => useSharedToolsFlyoutApi());
    result.current.openNotes({ hit });

    expect(getProperties().historyKey).toBe(DOC_VIEWER_FLYOUT_HISTORY_KEY);
  });
});
