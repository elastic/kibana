/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { EmptyMigration } from '.';
import { useGetSecuritySolutionLinkProps } from '../../../../common/components/links';

jest.mock('../../../../common/components/links', () => ({
  useGetSecuritySolutionLinkProps: jest.fn(),
}));

describe('EmptyMigration', () => {
  const onClickMock = jest.fn();

  beforeEach(() => {
    (useGetSecuritySolutionLinkProps as jest.Mock).mockReturnValue(() => ({
      onClick: onClickMock,
    }));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the empty prompt', () => {
    const { getByText, getByTestId } = render(<EmptyMigration />);

    expect(getByTestId('noTranslationAvailableForInstall')).toBeInTheDocument();
    expect(getByText('Empty migration')).toBeInTheDocument();
    expect(getByText('There are no translations available for installation')).toBeInTheDocument();
  });

  it('renders go back to migrations button', () => {
    const { getByText, getByTestId } = render(<EmptyMigration />);

    expect(getByTestId('goToSiemMigrationsButton')).toBeInTheDocument();
    expect(getByText('Go back to Automatic Migrations')).toBeInTheDocument();
  });

  it('calls the link handler when the button is clicked', () => {
    const { getByTestId } = render(<EmptyMigration />);

    fireEvent.click(getByTestId('goToSiemMigrationsButton'));
    expect(onClickMock).toHaveBeenCalled();
  });
});
