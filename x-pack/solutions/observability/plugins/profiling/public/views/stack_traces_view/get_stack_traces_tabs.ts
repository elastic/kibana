/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { TypeOf } from '@kbn/typed-react-router-config';
import type { AppHeaderTab } from '@kbn/app-header';
import { TopNType } from '@kbn/profiling-utils';
import type { StatefulProfilingRouter } from '../../hooks/use_profiling_router';
import type { ProfilingRoutes } from '../../routing';

export function getStackTracesTabs({
  path,
  query,
  profilingRouter,
}: TypeOf<ProfilingRoutes, '/stacktraces/{topNType}'> & {
  profilingRouter: StatefulProfilingRouter;
}): AppHeaderTab[] {
  return [
    {
      id: TopNType.Executables,
      label: i18n.translate('xpack.profiling.stackTracesView.executablesTabLabel', {
        defaultMessage: 'Executables',
      }),
      topNType: TopNType.Executables,
    },
    {
      id: TopNType.Threads,
      label: i18n.translate('xpack.profiling.stackTracesView.threadsTabLabel', {
        defaultMessage: 'Threads',
      }),
      topNType: TopNType.Threads,
    },
    {
      id: TopNType.Traces,
      label: i18n.translate('xpack.profiling.stackTracesView.tracesTabLabel', {
        defaultMessage: 'Traces',
      }),
      topNType: TopNType.Traces,
    },
    {
      id: TopNType.Hosts,
      label: i18n.translate('xpack.profiling.stackTracesView.hostsTabLabel', {
        defaultMessage: 'Hosts',
      }),
      topNType: TopNType.Hosts,
    },
    {
      id: TopNType.Deployments,
      label: i18n.translate('xpack.profiling.stackTracesView.deploymentsTabLabel', {
        defaultMessage: 'Deployments',
      }),
      topNType: TopNType.Deployments,
    },
    {
      id: TopNType.Containers,
      label: i18n.translate('xpack.profiling.stackTracesView.containersTabLabel', {
        defaultMessage: 'Containers',
      }),
      topNType: TopNType.Containers,
    },
  ].map((tab) => ({
    id: tab.id,
    label: tab.label,
    isSelected: tab.topNType === path.topNType,
    href: profilingRouter.link(`/stacktraces/{topNType}`, {
      path: { topNType: tab.topNType },
      query,
    }),
  }));
}
