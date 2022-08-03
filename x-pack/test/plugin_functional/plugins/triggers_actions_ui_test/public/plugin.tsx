/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Plugin, CoreStart, CoreSetup, AppMountParameters } from '@kbn/core/public';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { TriggersAndActionsUIPublicPluginStart } from '@kbn/triggers-actions-ui-plugin/public';
import { TypeRegistry } from '@kbn/triggers-actions-ui-plugin/public/application/type_registry';
import {
  AlertsTableConfigurationRegistry,
  AlertsTableFlyoutBaseProps,
} from '@kbn/triggers-actions-ui-plugin/public/types';
import { get } from 'lodash';
import { SortCombinations } from '@elastic/elasticsearch/lib/api/types';
import { renderApp } from './applications/alerts_table_test';

export interface TriggersActionsUiTestPluginStartDependencies {
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
  data: DataPublicPluginStart;
}

const columns = [
  {
    id: 'event.action',
    displayAsText: 'Alert status',
    initialWidth: 150,
  },
  {
    id: '@timestamp',
    displayAsText: 'Last updated',
    initialWidth: 250,
  },
  {
    id: 'kibana.alert.duration.us',
    displayAsText: 'Duration',
    initialWidth: 150,
  },
  {
    id: 'kibana.alert.reason',
    displayAsText: 'Reason',
  },
];

const FlyoutBody = ({ alert }: AlertsTableFlyoutBaseProps) => (
  <ul>
    {columns.map((column) => (
      <li data-test-subj={`alertsFlyout${column.displayAsText}`} key={column.id}>
        {get(alert as any, column.id, [])[0]}
      </li>
    ))}
  </ul>
);

const FlyoutHeader: React.FunctionComponent<AlertsTableFlyoutBaseProps> = ({ alert }) => {
  const { 'kibana.alert.rule.name': name } = alert;
  return <div data-test-subj="alertsFlyoutName">{name}</div>;
};

const useInternalFlyout = () => ({
  body: FlyoutBody,
  header: FlyoutHeader,
  footer: null,
});

export class TriggersActionsUiTestPlugin
  implements Plugin<void, void, {}, TriggersActionsUiTestPluginStartDependencies>
{
  public setup(core: CoreSetup<TriggersActionsUiTestPluginStartDependencies, void>) {
    core.application.register({
      id: 'triggersActionsUiTest',
      title: 'Triggers Actions Ui Test',
      mount: async (params: AppMountParameters<unknown>) => {
        const startServices = await core.getStartServices();
        const [coreStart, { data, triggersActionsUi }] = startServices;
        return renderApp({ ...coreStart, data, triggersActionsUi }, params);
      },
    });
  }

  public start(
    coreStart: CoreStart,
    { triggersActionsUi }: TriggersActionsUiTestPluginStartDependencies
  ) {
    const {
      alertsTableConfigurationRegistry,
    }: { alertsTableConfigurationRegistry: TypeRegistry<AlertsTableConfigurationRegistry> } =
      triggersActionsUi;

    const sort: SortCombinations[] = [
      {
        'event.action': {
          order: 'asc',
        },
      },
    ];

    const config = {
      id: 'triggersActionsUiTestId',
      columns,
      useInternalFlyout,
      getRenderCellValue: () => (props: any) => {
        const value = props.data.find((d: any) => d.field === props.columnId)?.value ?? [];
        return <>{value.length ? value.join() : '--'}</>;
      },
      sort,
    };
    alertsTableConfigurationRegistry.register(config);
  }
}
