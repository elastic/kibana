/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Plugin, CoreSetup, AppMountParameters } from 'kibana/public';
import { i18n } from '@kbn/i18n';
import { TimelinePluginSetup, TimelinePluginStart } from '../../../../../plugins/timeline/public';
import { renderApp } from './applications/timeline_test';

export type TimelineTestPluginSetup = void;
export type TimelineTestPluginStart = void;
export interface TimelineTestPluginSetupDependencies {
  timeline: TimelinePluginSetup;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface TimelineTestPluginStartDependencies {}

export class TimelineTestPlugin
  implements
    Plugin<
      TimelineTestPluginSetup,
      TimelineTestPluginStart,
      TimelineTestPluginSetupDependencies,
      TimelineTestPluginStartDependencies
    > {
  public setup(
    core: CoreSetup<TimelineTestPluginStartDependencies, TimelineTestPluginStart>,
    setupDependencies: TimelineTestPluginSetupDependencies
  ) {
    core.application.register({
      id: 'timelineTest',
      title: i18n.translate('xpack.timelineTest.pluginTitle', {
        defaultMessage: 'Timeline Test',
      }),
      mount: async (params: AppMountParameters<unknown>) => {
        const startServices = await core.getStartServices();
        const [coreStart] = startServices;
        const { timeline } = setupDependencies;

        return renderApp(coreStart, params, timeline);
      },
    });
  }

  public start() {}
}
