/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { CoreStart } from '@kbn/core/public';
import { createKibanaReactContext } from '@kbn/kibana-react-plugin/public';
import { createMemoryHistory } from 'history';
import { RouterProvider } from '@kbn/typed-react-router-config';
import { I18nProvider } from '@kbn/i18n-react';
import { EuiThemeProvider } from '@elastic/eui';
import { getMockInventoryContext } from '../../../../.storybook/get_mock_inventory_context';
import { inventoryRouter } from '../../../routes/config';
import { InventoryContextProvider } from '../../../context/inventory_context_provider';

export function InventoryComponentWrapperMock({ children }: React.PropsWithChildren<{}>) {
  const context = getMockInventoryContext();
  const KibanaReactContext = createKibanaReactContext(context as unknown as Partial<CoreStart>);
  const history = createMemoryHistory({
    initialEntries: ['/'],
  });
  return (
    <I18nProvider>
      <EuiThemeProvider>
        <KibanaReactContext.Provider>
          <InventoryContextProvider context={getMockInventoryContext()}>
            <RouterProvider router={inventoryRouter} history={history}>
              {children}
            </RouterProvider>
          </InventoryContextProvider>
        </KibanaReactContext.Provider>
      </EuiThemeProvider>
    </I18nProvider>
  );
}
