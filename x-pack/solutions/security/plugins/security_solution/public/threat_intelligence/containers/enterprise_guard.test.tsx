/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { EMPTY_PAGE_SECURITY_TEMPLATE, TestProvidersComponent } from '../mocks/test_providers';
import { EnterpriseGuard } from './enterprise_guard';
import { useLicense } from '../../common/hooks/use_license';

jest.mock('../../app/home/template_wrapper', () => ({
  SecuritySolutionTemplateWrapper: () => <div />,
}));
jest.mock('../../common/hooks/use_license');

describe('<EnterpriseGuard />', () => {
  describe('when on enterprise plan', () => {
    beforeEach(() => {
      (useLicense as jest.Mock).mockReturnValue({
        isEnterprise: jest.fn().mockReturnValue(true),
      });
    });

    it('should render specified children', () => {
      render(
        <EnterpriseGuard>
          <div>{'enterprise only content'}</div>
        </EnterpriseGuard>,
        { wrapper: TestProvidersComponent }
      );

      expect(screen.queryByText('enterprise only content')).toBeInTheDocument();
      expect(screen.queryByTestId('tiPaywall')).not.toBeInTheDocument();
      expect(screen.queryByTestId(EMPTY_PAGE_SECURITY_TEMPLATE)).not.toBeInTheDocument();
    });
  });

  describe('when not on enterprise plan', () => {
    beforeEach(() => {
      (useLicense as jest.Mock).mockReturnValue({
        isEnterprise: jest.fn().mockReturnValue(false),
      });
    });

    it('should render the paywall', () => {
      render(
        <IntlProvider>
          <EnterpriseGuard>
            <div>{'enterprise only content'}</div>
          </EnterpriseGuard>
        </IntlProvider>
      );

      expect(screen.queryByText('enterprise only content')).not.toBeInTheDocument();
    });
  });
});
