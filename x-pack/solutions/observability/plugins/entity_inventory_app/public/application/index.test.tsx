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
import type { History } from 'history';
import { CoreScopedHistory } from '@kbn/core/public';
import { I18nProvider } from '@kbn/i18n-react';
import { RouterProvider } from '@kbn/typed-react-router-config';
import { MockAppHeaderProvider } from '@kbn/app-header/mocks';
import type { ObservabilitySharedPluginStart } from '@kbn/observability-shared-plugin/public';
import { EntityInventoryShell } from '.';
import { entityInventoryRouter } from '../routes/config';

const PageTemplate = (({ children }: { children: React.ReactNode }) => (
  <div>{children}</div>
)) as unknown as ObservabilitySharedPluginStart['navigation']['PageTemplate'];

const APP_BASE_PATH = '/app/entity-inventory';

const renderShell = (history: History) => {
  render(
    <I18nProvider>
      <EuiProvider>
        <MockAppHeaderProvider>
          <RouterProvider history={history} router={entityInventoryRouter}>
            <EntityInventoryShell PageTemplate={PageTemplate} />
          </RouterProvider>
        </MockAppHeaderProvider>
      </EuiProvider>
    </I18nProvider>
  );
};

const renderShellAt = (path: string) => {
  const history = createMemoryHistory({ initialEntries: [path] });
  renderShell(history);

  return { history };
};

describe('EntityInventoryShell', () => {
  it.each(['/all-resources', '/hosts', '/kubernetes'])(
    'renders the content of the page %s',
    (path) => {
      renderShellAt(path);

      expect(
        screen.getByRole('heading', { name: 'Entity Inventory content here.' })
      ).toBeInTheDocument();
    }
  );

  it.each(['/', '/unknown'])('redirects the path %s to all resources', (path) => {
    const { history } = renderShellAt(path);

    expect(history.location.pathname).toBe('/all-resources');
    expect(
      screen.getByRole('heading', { name: 'Entity Inventory content here.' })
    ).toBeInTheDocument();
  });

  it('redirects the base path of the app, where the scoped history has an empty pathname', () => {
    const parentHistory = createMemoryHistory({ initialEntries: [APP_BASE_PATH] });
    const scopedHistory = new CoreScopedHistory(parentHistory, APP_BASE_PATH);
    expect(scopedHistory.location.pathname).toBe('');

    renderShell(scopedHistory);

    expect(parentHistory.location.pathname).toBe(`${APP_BASE_PATH}/all-resources`);
    expect(
      screen.getByRole('heading', { name: 'Entity Inventory content here.' })
    ).toBeInTheDocument();
  });
});
