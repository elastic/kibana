/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Plugin, CoreSetup, AppMountParameters } from 'kibana/public';
import { i18n } from '@kbn/i18n';
import { TimelinesPluginSetup } from '../../../../../plugins/timelines/public';
import { renderApp } from './applications/timelines_test';

export type TimelinesTestPluginSetup = void;
export type TimelinesTestPluginStart = void;
export interface TimelinesTestPluginSetupDependencies {
  timelines: TimelinesPluginSetup;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface TimelinesTestPluginStartDependencies {}

export class TimelinesTestPlugin
  implements
    Plugin<
      TimelinesTestPluginSetup,
      void,
      TimelinesTestPluginSetupDependencies,
      TimelinesTestPluginStartDependencies
    > {
  public setup(
    core: CoreSetup<TimelinesTestPluginStartDependencies, TimelinesTestPluginStart>,
    setupDependencies: TimelinesTestPluginSetupDependencies
  ) {
    core.application.register({
      id: 'timelinesTest',
      title: i18n.translate('xpack.timelinesTest.pluginTitle', {
        defaultMessage: 'Timelines Test',
      }),
      mount: async (params: AppMountParameters<unknown>) => {
        const startServices = await core.getStartServices();
        const [coreStart] = startServices;
        const { timelines } = setupDependencies;

        return renderApp(coreStart, params, timelines);
      },
    });
  }

  public start() {}
}
