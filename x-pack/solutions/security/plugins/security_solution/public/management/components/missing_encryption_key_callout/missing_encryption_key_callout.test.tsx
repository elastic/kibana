/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RenderResult } from '@testing-library/react';
import { fireEvent, render } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import React from 'react';
import { useGetActionState } from '../../hooks';
import { MissingEncryptionKeyCallout } from './missing_encryption_key_callout';

jest.mock('../../hooks', () => ({ useGetActionState: jest.fn() }));
jest.mock('../../../common/lib/kibana', () => ({
  useKibana: () => ({
    services: { docLinks: { links: { kibana: { secureSavedObject: 'http://doc.link' } } } },
  }),
}));

const useGetActionStateMock = useGetActionState as jest.Mock;

describe('Missing encryption key callout', () => {
  const renderCallout = (canEncrypt: boolean): RenderResult => {
    useGetActionStateMock.mockReturnValue({ data: { data: { canEncrypt } } });

    return render(<MissingEncryptionKeyCallout />, { wrapper: I18nProvider });
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be visible when encryption key not set', () => {
    const { queryByTestId } = renderCallout(false);

    expect(queryByTestId('missingEncryptionKeyCallout')).toBeTruthy();
  });

  it('should not be visible when encryption key is set', () => {
    const { queryByTestId } = renderCallout(true);

    expect(queryByTestId('missingEncryptionKeyCallout')).toBeFalsy();
  });

  it('should be able to dismiss when visible', () => {
    const { queryByTestId, getByTestId } = renderCallout(false);
    expect(queryByTestId('missingEncryptionKeyCallout')).toBeTruthy();

    fireEvent.click(getByTestId('dismissEncryptionKeyCallout'));

    expect(queryByTestId('missingEncryptionKeyCallout')).toBeFalsy();
  });
});
