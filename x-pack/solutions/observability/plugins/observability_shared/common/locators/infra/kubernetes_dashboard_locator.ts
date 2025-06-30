/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import rison from '@kbn/rison';
import { SerializableRecord } from '@kbn/utility-types';
import { LocatorDefinition, LocatorPublic } from '@kbn/share-plugin/common';

export type KubernetesDashboardLocator = LocatorPublic<KubernetesDashboardLocatorParams>;

export interface KubernetesDashboardLocatorParams extends SerializableRecord {
  dashboardId?: string;
  dateRange?: {
    from: string;
    to: string;
  };
}

export const KUBERNETES_DASHBOARD_LOCATOR_ID = 'KUBERNETES_DASHBOARD_LOCATOR_ID';

export class KubernetesDashboardLocatorDefinition
  implements LocatorDefinition<KubernetesDashboardLocatorParams>
{
  public readonly id = KUBERNETES_DASHBOARD_LOCATOR_ID;

  public readonly getLocation = async (
    params?: KubernetesDashboardLocatorParams & { state?: SerializableRecord }
  ) => {
    const paramsWithDefaults = {
      dateRange: params?.dateRange ?? { from: 'now-15m', to: 'now' },
    };
    const dataRangeValue = rison.encodeUnknown(paramsWithDefaults);
    const path = params?.dashboardId
      ? `/kubernetes/${params.dashboardId}?dashboardParams=${dataRangeValue}`
      : '/kubernetes';

    return {
      app: 'metrics',
      path,
      state: params?.state ? params.state : {},
    };
  };
}
