/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LocatorDefinition } from '@kbn/share-plugin/public';
import {
  sloDetailsHistoryLocatorID,
  type SloDetailsHistoryLocatorParams,
} from '@kbn/deeplinks-observability';
import { ALL_VALUE } from '@kbn/slo-schema/src/schema/common';

export class SloDetailsHistoryLocatorDefinition
  implements LocatorDefinition<SloDetailsHistoryLocatorParams>
{
  public readonly id = sloDetailsHistoryLocatorID;

  public readonly getLocation = async ({
    id,
    instanceId,
    encodedAppState,
  }: SloDetailsHistoryLocatorParams) => {
    const qs = new URLSearchParams();
    if (!!instanceId && instanceId !== ALL_VALUE) qs.append('instanceId', instanceId);
    if (!!encodedAppState) qs.append('_a', encodedAppState);

    return {
      app: 'slo',
      path: `/${encodeURIComponent(id)}/history${formatQueryParams(qs)}`,
      state: {},
    };
  };
}

function formatQueryParams(qs: URLSearchParams): string {
  if (qs.size === 0) {
    return '';
  }
  return `?${qs.toString()}`;
}
