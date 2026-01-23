/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LocatorDefinition } from '@kbn/share-plugin/public';
import { sloDetailsLocatorID, type SloDetailsLocatorParams } from '@kbn/deeplinks-observability';
import { ALL_VALUE } from '@kbn/slo-schema/src/schema/common';

export class SloDetailsLocatorDefinition implements LocatorDefinition<SloDetailsLocatorParams> {
  public readonly id = sloDetailsLocatorID;

  public readonly getLocation = async ({ sloId, instanceId, tabId }: SloDetailsLocatorParams) => {
    const qs = new URLSearchParams();
    if (!!instanceId && instanceId !== ALL_VALUE) qs.append('instanceId', instanceId);

    let path = `/${encodeURIComponent(sloId)}${formatQueryParams(qs)}`;
    if (tabId) {
      path = `/${encodeURIComponent(sloId)}/${tabId}${formatQueryParams(qs)}`;
    }

    return {
      app: 'slo',
      path,
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
