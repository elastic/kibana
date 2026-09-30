/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, lazy } from 'react';
import type { Store } from 'redux-v4';
import type { StartServices } from '../../types';
import { flyoutProviders } from '../shared/components/flyout_provider';
import { FlyoutLoading } from '../shared/components/flyout_loading';
import { FlyoutSessionContextProvider } from '../session_context';
import {
  IMPACT_ENTITY_SCOPE_ID,
  impactEntityChildFlyoutProperties,
  impactEntityEngineType,
  type ImpactEntityChildTarget,
} from './impact_entity_child_flyout';

const Host = lazy(() => import('./host/main').then((m) => ({ default: m.Host })));
const User = lazy(() => import('./user/main').then((m) => ({ default: m.User })));
const Service = lazy(() => import('./service/main').then((m) => ({ default: m.Service })));
const GenericEntity = lazy(() =>
  import('./generic/main').then((m) => ({ default: m.GenericEntity }))
);

const ImpactEntityPanel = ({ entity }: { entity: ImpactEntityChildTarget }) => {
  const label = entity.name ?? entity.id;
  const scopeId = IMPACT_ENTITY_SCOPE_ID;

  switch (impactEntityEngineType(entity.type)) {
    case 'host':
      return <Host hostName={label} entityId={entity.id} scopeId={scopeId} />;
    case 'user':
      return <User userName={label} entityId={entity.id} scopeId={scopeId} />;
    case 'service':
      return <Service serviceName={label} entityId={entity.id} scopeId={scopeId} />;
    default:
      return <GenericEntity entityId={entity.id} scopeId={scopeId} />;
  }
};

/**
 * Opens a Flyout V2 entity panel as a child of the investigation session.
 *
 * Not `useEntityFlyoutApi`: that hook has to run inside the Security app shell, and AlertZero
 * cannot import this plugin. The discover-flyout store and services keep the panel working when
 * the Security app route is not mounted. Knowledge-indicator rows never reach this function.
 */
export const openImpactEntityChildFlyout = ({
  services,
  store,
  entity,
  historyKey,
}: {
  services: StartServices;
  store: Store;
  entity: ImpactEntityChildTarget;
  historyKey: symbol;
}): void => {
  services.overlays.openSystemFlyout(
    flyoutProviders({
      services,
      store,
      children: (
        <FlyoutSessionContextProvider
          value={{ session: 'inherit', historyKey, isChildFlyout: true }}
        >
          <Suspense fallback={<FlyoutLoading />}>
            <ImpactEntityPanel entity={entity} />
          </Suspense>
        </FlyoutSessionContextProvider>
      ),
    }),
    impactEntityChildFlyoutProperties(entity, historyKey)
  );
};
