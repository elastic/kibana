/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PropsWithChildren } from 'react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { SecurityPageName } from '@kbn/deeplinks-security';
import { KibanaErrorBoundaryProvider } from '@kbn/shared-ux-error-boundary';
import { TestProviders } from '../../../../../../../common/mock';
import { RouterSpyStateContext } from '../../../../../../../common/utils/route/helpers';
import { AllRulesTabs } from '../../../../../components/rules_table/rules_table_toolbar';

export function TestRuleUpgradeProviders({ children }: PropsWithChildren<{}>): JSX.Element {
  return (
    <KibanaErrorBoundaryProvider analytics={undefined}>
      <RouterSpyStateContext.Provider
        value={[
          {
            pageName: SecurityPageName.rules,
            detailName: undefined,
            tabName: AllRulesTabs.updates,
            search: '',
            pathName: '/',
            state: undefined,
          },
          jest.fn(),
        ]}
      >
        <MemoryRouter>
          <TestProviders>{children}</TestProviders>
        </MemoryRouter>
      </RouterSpyStateContext.Provider>
    </KibanaErrorBoundaryProvider>
  );
}
