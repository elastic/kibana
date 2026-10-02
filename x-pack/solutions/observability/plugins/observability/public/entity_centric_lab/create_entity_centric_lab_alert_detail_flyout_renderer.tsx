/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { CoreStart } from '@kbn/core/public';
import type { AlertRow } from '@kbn/entity-centric-lab-flyout';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { ReactNode } from 'react';
import { AlertsFlyout } from '../components/alerts_flyout/alerts_flyout';
import type { ObservabilityPublicPluginsStart } from '../plugin';
import type { ObservabilityRuleTypeRegistry } from '../rules/create_observability_rule_type_registry';
import { alertRowToObservabilityAlert } from './alert_row_to_observability_alert';

export type EntityCentricLabAlertDetailFlyoutRenderer = (props: {
  readonly alertRow: AlertRow;
  readonly entityName: string;
  readonly onClose: () => void;
}) => ReactNode;

export const createEntityCentricLabAlertDetailFlyoutRenderer = ({
  coreStart,
  pluginsStart,
  observabilityRuleTypeRegistry,
}: {
  coreStart: CoreStart;
  pluginsStart: ObservabilityPublicPluginsStart;
  observabilityRuleTypeRegistry: ObservabilityRuleTypeRegistry;
}): EntityCentricLabAlertDetailFlyoutRenderer => {
  // The flyout is rendered inside the host app's tree, so it needs
  // Observability's own services (e.g. `share`) rather than the host's.
  const services = { ...coreStart, ...pluginsStart };
  return ({ alertRow, entityName, onClose }) => {
    const alert = alertRowToObservabilityAlert(alertRow, entityName);
    return (
      <KibanaContextProvider services={services}>
        <AlertsFlyout
          alert={alert}
          observabilityRuleTypeRegistry={observabilityRuleTypeRegistry}
          onClose={onClose}
          tableId="xpack.streams.entityCentricLab.alertsTab"
          flyoutSession="inherit"
          ownFocus={false}
          flyoutSize="s"
          flyoutTitleSize="s"
        />
      </KibanaContextProvider>
    );
  };
};
