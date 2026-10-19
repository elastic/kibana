/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { copyToClipboard } from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useCopyInvestigationLink } from './use_copy_investigation_link';

jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  copyToClipboard: jest.fn(),
}));
jest.mock('@kbn/kibana-react-plugin/public', () => ({ useKibana: jest.fn() }));

const mockCopy = copyToClipboard as jest.MockedFunction<typeof copyToClipboard>;
const addSuccess = jest.fn();
const addDanger = jest.fn();
const getUrlForApp = jest.fn(
  (appId: string, { path }: { path: string }) => `http://localhost:5601/app/${appId}${path}`
);

describe('useCopyInvestigationLink', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        application: { getUrlForApp },
        notifications: { toasts: { addSuccess, addDanger } },
      },
    });
  });

  it('copies the app link that opens the conversation and confirms', () => {
    mockCopy.mockReturnValue(true);
    const { result } = renderHook(() => useCopyInvestigationLink());

    expect(result.current('conv-1')).toBe(true);

    expect(mockCopy).toHaveBeenCalledWith(
      'http://localhost:5601/app/alertzero?selectedConversationId=conv-1'
    );
    expect(getUrlForApp).toHaveBeenCalledWith('alertzero', {
      path: '?selectedConversationId=conv-1',
      absolute: true,
    });
    // Success is confirmed by the caller's own control, not here.
    expect(addSuccess).not.toHaveBeenCalled();
    expect(addDanger).not.toHaveBeenCalled();
  });

  it('reports a failed copy', () => {
    mockCopy.mockReturnValue(false);
    const { result } = renderHook(() => useCopyInvestigationLink());

    expect(result.current('conv-1')).toBe(false);

    expect(addDanger).toHaveBeenCalledWith('Could not copy the link');
    expect(addSuccess).not.toHaveBeenCalled();
  });
});
