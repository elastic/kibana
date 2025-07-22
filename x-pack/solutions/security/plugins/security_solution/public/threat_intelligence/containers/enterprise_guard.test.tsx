/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import { EMPTY_PAGE_SECURITY_TEMPLATE, TestProvidersComponent } from '../mocks/test_providers';
import { EnterpriseGuard } from './enterprise_guard';
import { useSecurityContext } from '../hooks/use_security_context';

jest.mock('./security_solution_plugin_template_wrapper');
jest.mock('../hooks/use_security_context');

describe('<EnterpriseGuard />', () => {
  describe('when on enterprise plan', () => {
    beforeEach(() => {
      jest.mocked(useSecurityContext().licenseService.isEnterprise).mockReturnValue(true);
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
      jest.mocked(useSecurityContext().licenseService.isEnterprise).mockReturnValue(false);
    });

    it('should render the paywall', () => {
      render(
        <EnterpriseGuard>
          <div>{'enterprise only content'}</div>
        </EnterpriseGuard>,
        { wrapper: TestProvidersComponent }
      );

      expect(screen.queryByText('enterprise only content')).not.toBeInTheDocument();
      expect(screen.queryByTestId('tiPaywall')).toBeInTheDocument();
      expect(screen.queryByTestId(EMPTY_PAGE_SECURITY_TEMPLATE)).toBeInTheDocument();
    });
  });
});
