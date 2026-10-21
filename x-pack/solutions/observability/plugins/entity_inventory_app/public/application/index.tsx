/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiText } from '@elastic/eui';
import React, { useMemo } from 'react';
import ReactDOM from 'react-dom';
import type { CoreStart, StartServicesAccessor } from '@kbn/core/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { EntityInventoryAppProps, EntityInventoryAppStartDependencies } from '../types';
import { EntityInventoryPageShell } from './components/entity_inventory_page_shell';
import { DEFAULT_ENTITY_TYPE } from './constants';
import { ENTITY_LIST_PLACEHOLDER } from './translations';

export interface EntityInventoryAppDeps {
  core: CoreStart;
  plugins: EntityInventoryAppStartDependencies;
}

export const EntityInventoryApp = ({
  core,
  plugins,
  entityType = DEFAULT_ENTITY_TYPE,
}: EntityInventoryAppDeps & EntityInventoryAppProps) => {
  const services = useMemo(() => ({ ...core, ...plugins }), [core, plugins]);

  return (
    <KibanaContextProvider services={services}>
      <EntityInventoryPageShell entityType={entityType}>
        <EuiText color="subdued" data-test-subj="entityInventoryPlaceholder">
          <p>{ENTITY_LIST_PLACEHOLDER}</p>
        </EuiText>
      </EntityInventoryPageShell>
    </KibanaContextProvider>
  );
};

/** Binds the app to the plugin's start services so a host app can render it with props only. */
export const createBoundEntityInventoryApp = (deps: EntityInventoryAppDeps) => {
  const BoundEntityInventoryApp = (props: EntityInventoryAppProps) => (
    <EntityInventoryApp {...deps} {...props} />
  );
  return BoundEntityInventoryApp;
};

export const renderApp = async (
  element: HTMLElement,
  getStartServices: StartServicesAccessor<EntityInventoryAppStartDependencies>
) => {
  const [core, plugins] = await getStartServices();
  ReactDOM.render(
    core.rendering.addContext(<EntityInventoryApp core={core} plugins={plugins} />),
    element
  );
  return () => ReactDOM.unmountComponentAtNode(element);
};
