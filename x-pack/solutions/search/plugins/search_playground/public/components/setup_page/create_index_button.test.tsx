/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, PropsWithChildren } from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { useKibana } from '../../hooks/use_kibana';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { CreateIndexButton } from './create_index_button';

// Mocking the useKibana hook
jest.mock('../../hooks/use_kibana', () => ({
  useKibana: jest.fn(() => ({
    services: {
      application: {
        navigateToUrl: jest.fn(),
      },
      chrome: {
        navLinks: {
          get: jest.fn().mockReturnValue(undefined),
        },
      },
    },
  })),
}));

const Wrapper: FC<PropsWithChildren<unknown>> = ({ children }) => {
  return (
    <>
      <IntlProvider locale="en">{children}</IntlProvider>
    </>
  );
};

describe('CreateIndexButton', () => {
  it('renders correctly when there is no link to indices', async () => {
    const { queryByTestId } = render(<CreateIndexButton />, { wrapper: Wrapper });

    expect(queryByTestId('createIndexButton')).not.toBeInTheDocument();
  });

  it('renders correctly when navlink exists', async () => {
    const navigateToUrl = jest.fn();

    (useKibana as unknown as jest.Mock).mockImplementation(() => ({
      services: {
        application: {
          navigateToUrl,
        },
        chrome: {
          navLinks: {
            get: jest.fn().mockReturnValue({
              url: 'mock-url',
            }),
          },
        },
      },
    }));

    const { getByTestId } = render(<CreateIndexButton />, { wrapper: Wrapper });

    const createIndexButton = getByTestId('createIndexButton');
    expect(createIndexButton).toBeInTheDocument();

    fireEvent.click(createIndexButton);

    await waitFor(() => {
      expect(navigateToUrl).toHaveBeenCalledWith('mock-url');
    });
  });
});
