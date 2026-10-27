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
import type { ObservabilitySharedPluginStart } from '@kbn/observability-shared-plugin/public';
import { EntityInventoryShell } from '.';

const PageTemplate = (({ children }: { children: React.ReactNode }) => (
  <div>{children}</div>
)) as unknown as ObservabilitySharedPluginStart['navigation']['PageTemplate'];

const renderShell = (path: string) => {
  const history = createMemoryHistory({ initialEntries: [path] });

  return render(
    <I18nProvider>
      <EuiProvider>
        <MockAppHeaderProvider>
          <Router history={history}>
            <EntityInventoryShell PageTemplate={PageTemplate} />
          </Router>
        </MockAppHeaderProvider>
      </EuiProvider>
    </I18nProvider>
  );
};

describe('EntityInventoryShell', () => {
  it.each(['/all-resources', '/hosts', '/kubernetes'])(
    'renders the content of the page %s',
    (path) => {
      renderShell(path);

      expect(
        screen.getByRole('heading', { name: 'Entity Inventory content here.' })
      ).toBeInTheDocument();
    }
  );

  it('redirects the root path to all resources', () => {
    renderShell('/');

    expect(
      screen.getByRole('heading', { name: 'Entity Inventory content here.' })
    ).toBeInTheDocument();
  });
});
