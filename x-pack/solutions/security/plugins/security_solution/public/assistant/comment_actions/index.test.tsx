/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { CommentActions } from '.';
import type { ClientMessage } from '@kbn/elastic-assistant';
import { createMockStore, mockGlobalState, TestProviders } from '../../common/mock';
import { EuiCopy } from '@elastic/eui';

jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  EuiCopy: jest.fn(() => null),
}));

const Wrapper: React.FC<React.PropsWithChildren> = ({ children }) => {
  const store = createMockStore(mockGlobalState);

  return <TestProviders store={store}>{children}</TestProviders>;
};

describe('CommentActions', () => {
  it('textToCopy is correct', async () => {
    const message: ClientMessage = {
      content: `Only this should be copied!!{citation[example](/example/link)}`,
      role: 'assistant',
      timestamp: '2025-01-08T10:47:34.578Z',
    };
    render(<CommentActions message={message} />, { wrapper: Wrapper });

    expect(EuiCopy).toHaveBeenCalledTimes(1);
    expect(EuiCopy).toHaveBeenCalledWith(
      expect.objectContaining({
        textToCopy: 'Only this should be copied!',
      }),
      expect.anything()
    );
  });
});
