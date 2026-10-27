/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { createMemoryHistory } from 'history';
import { I18nProvider } from '@kbn/i18n-react';
import { Router } from '@kbn/shared-ux-router';
import { MockAppHeaderProvider } from '@kbn/app-header/mocks';
import type { CoreStart } from '@kbn/core/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { ObservabilitySharedPluginStart } from '@kbn/observability-shared-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import { EntityInventoryShell } from '.';

const share = {
  url: { locators: { get: () => ({ getRedirectUrl: () => '/app/observabilityOnboarding/' }) } },
} as unknown as SharePluginStart;

const application = {
  getUrlForApp: () => '/app/integrations/browse',
} as unknown as CoreStart['application'];

const PageTemplate = (({ children }: { children: React.ReactNode }) => (
  <div>{children}</div>
)) as unknown as ObservabilitySharedPluginStart['navigation']['PageTemplate'];

const renderShell = (path: string) => {
  const history = createMemoryHistory({ initialEntries: [path] });

  return render(
    <I18nProvider>
      <EuiProvider>
        <MockAppHeaderProvider>
          <KibanaContextProvider services={{ share, application }}>
            <Router history={history}>
              <EntityInventoryShell PageTemplate={PageTemplate} />
            </Router>
          </KibanaContextProvider>
        </MockAppHeaderProvider>
      </EuiProvider>
    </I18nProvider>
  );
};

describe('EntityInventoryShell', () => {
  it.each([
    ['/all-resources', 'all'],
    ['/hosts', 'hosts'],
    ['/kubernetes', 'kubernetes'],
  ])('shows the no data state of the page %s', (path, entityCategory) => {
    renderShell(path);

    expect(screen.getByTestId('entityInventoryNoData')).toBeInTheDocument();
    expect(screen.getByTestId('entityInventoryNoDataAddDataButton')).toHaveAttribute(
      'data-ebt-detail',
      entityCategory
    );
  });

  it('redirects the root path to all resources and shows the no data state', () => {
    renderShell('/');

    expect(screen.getByTestId('entityInventoryNoData')).toBeInTheDocument();
  });
});
