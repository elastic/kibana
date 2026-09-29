/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import { render } from '@testing-library/react';
import { useNavigation } from '@kbn/security-solution-navigation';
import { SuccessToastContent } from './success_notification';
import { getRuleMigrationStatsMock } from '../../__mocks__';
import { TestProviders } from '../../../../common/mock';

vi.mock('@kbn/security-solution-navigation', async () => {
      const mocked = {
      ...(await vi.importActual('@kbn/security-solution-navigation')),
      useNavigation: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

const navigateTo = vi.fn();
const getAppUrl = vi.fn(() => 'some/url');
const useNavigationMock = useNavigation as Mock;

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
          <SuccessToastContent migration={getRuleMigrationStatsMock()} dismissHandler={vi.fn()} />
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
          <SuccessToastContent migration={getRuleMigrationStatsMock()} dismissHandler={vi.fn()} />
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
