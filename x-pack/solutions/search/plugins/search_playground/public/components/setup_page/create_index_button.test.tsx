/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, PropsWithChildren } from 'react';
import React from 'react';
import { render } from '@testing-library/react';
import { useKibana } from '../../hooks/use_kibana';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { CreateIndexButton } from './create_index_button';

jest.mock('../../hooks/use_kibana', () => ({
  useKibana: jest.fn(() => ({
    services: {},
  })),
}));

const Wrapper: FC<PropsWithChildren<unknown>> = ({ children }) => {
  return (
    <>
      <IntlProvider locale="en">{children}</IntlProvider>
    </>
  );
};

const mockShareWithUrl = (url: string | undefined) => ({
  url: {
    locators: {
      get: jest.fn().mockReturnValue({
        useUrl: jest.fn().mockReturnValue(url),
      }),
    },
  },
});

describe('CreateIndexButton', () => {
  it('renders correctly when there is no link to indices', async () => {
    const { queryByTestId } = render(<CreateIndexButton />, { wrapper: Wrapper });

    expect(queryByTestId('createIndexButton')).not.toBeInTheDocument();
  });

  it('renders correctly when navlink exists', async () => {
    (useKibana as unknown as jest.Mock).mockImplementation(() => ({
      services: {
        share: mockShareWithUrl('mock-url'),
      },
    }));

    const { getByTestId } = render(<CreateIndexButton />, { wrapper: Wrapper });

    const createIndexButton = getByTestId('createIndexButton');
    expect(createIndexButton).toBeInTheDocument();
    expect(createIndexButton).toHaveAttribute('href', 'mock-url');
  });
});
