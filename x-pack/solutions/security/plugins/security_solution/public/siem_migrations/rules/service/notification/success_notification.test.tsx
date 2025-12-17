/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { useNavigation } from '@kbn/security-solution-navigation';
import { SuccessToastContent } from './success_notification';
import { getRuleMigrationStatsMock } from '../../__mocks__';
import { TestProviders } from '../../../../common/mock';

jest.mock('@kbn/security-solution-navigation', () => ({
  ...jest.requireActual('@kbn/security-solution-navigation'),
  useNavigation: jest.fn(),
}));

const navigateTo = jest.fn();
const getAppUrl = jest.fn(() => 'some/url');
const useNavigationMock = useNavigation as jest.Mock;

describe('Success Notification', () => {
  describe('SuccessToastContent', () => {
    beforeEach(() => {
      useNavigationMock.mockReturnValue({
        navigateTo,
        getAppUrl,
      });
    });

    it('renders the component with correct text and button', () => {
      const { getByText, getByRole } = render(
        <TestProviders>
          <SuccessToastContent migration={getRuleMigrationStatsMock()} dismissHandler={jest.fn()} />
        </TestProviders>
      );

      expect(
        getByText(
          'Migration "test migration" has finished. Results have been added to the translated rules page.'
        )
      ).toBeInTheDocument();

      const button = getByRole('link', { name: 'Go to translated rules' });
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute('href', 'some/url');
    });

    it('calls navigateTo when the button is clicked', () => {
      const { getByRole } = render(
        <TestProviders>
          <SuccessToastContent migration={getRuleMigrationStatsMock()} dismissHandler={jest.fn()} />
        </TestProviders>
      );

      const button = getByRole('link', { name: 'Go to translated rules' });
      button.click();

      expect(navigateTo).toHaveBeenCalledWith({
        deepLinkId: 'siem_migrations-rules',
        path: '1',
      });
    });
  });
});
