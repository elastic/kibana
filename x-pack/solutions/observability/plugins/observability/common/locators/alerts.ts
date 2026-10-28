/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import queryString from 'query-string';
import rison from '@kbn/rison';
import { url as urlUtils } from '@kbn/kibana-utils-plugin/common';
import { addSpaceIdToPath } from '@kbn/core-spaces-common';
import type { SerializableRecord } from '@kbn/utility-types';
import type { LocatorDefinition, LocatorPublic } from '@kbn/share-plugin/public';
import { alertsLocatorID, observabilityAppId } from '..';
import { ALERTS_URL_STORAGE_KEY } from '../constants';
import { ALERTS_PATH as ALERTS_PATH_IN_APP, OBSERVABILITY_BASE_PATH } from './paths';
import type { AlertStatus } from '../typings';

export type AlertsLocator = LocatorPublic<AlertsLocatorParams>;

export interface AlertsLocatorParams extends SerializableRecord {
  /**
   * Public base URL and space of an absolute URL, for example in an alert's `kibana.alert.url`.
   * Without them the location is relative to the Observability app, for navigation in the browser.
   */
  baseUrl?: string;
  spaceId?: string;
  /** Opens this alert's details page (`kibana.alert.uuid`) instead of the alerts list. */
  alertId?: string;
  rangeFrom?: string;
  rangeTo?: string;
  kuery?: string;
  status?: AlertStatus;
}

export const ALERTS_PATH = `${OBSERVABILITY_BASE_PATH}${ALERTS_PATH_IN_APP}`;

function fromQuery(query: Record<string, any>) {
  const encodedQuery = urlUtils.encodeQuery(query, (value) =>
    encodeURIComponent(value).replace(/%3A/g, ':')
  );

  return queryString.stringify(encodedQuery, { sort: false, encode: false });
}

export class AlertsLocatorDefinition implements LocatorDefinition<AlertsLocatorParams> {
  public readonly id = alertsLocatorID;

  public readonly getLocation = async ({
    baseUrl,
    spaceId,
    alertId,
    kuery,
    rangeTo,
    rangeFrom,
    status,
  }: AlertsLocatorParams) => {
    if (alertId !== undefined) {
      const alertPath = `/alerts/${encodeURIComponent(alertId)}`;
      return baseUrl !== undefined && spaceId !== undefined
        ? {
            app: 'observability',
            path: addSpaceIdToPath(baseUrl, spaceId, `${OBSERVABILITY_BASE_PATH}${alertPath}`),
            state: {},
          }
        : { app: observabilityAppId, path: alertPath, state: {} };
    }

    const appState: {
      rangeFrom?: string;
      rangeTo?: string;
      kuery?: string;
      status?: AlertStatus;
    } = {};

    appState.rangeFrom = rangeFrom || 'now-15m';
    appState.rangeTo = rangeTo || 'now';
    appState.kuery = kuery || '';
    appState.status = status || 'all';

    const search = fromQuery({ [ALERTS_URL_STORAGE_KEY]: rison.encodeUnknown(appState) });
    if (baseUrl === undefined || spaceId === undefined) {
      return { app: observabilityAppId, path: `${ALERTS_PATH_IN_APP}?${search}`, state: {} };
    }

    const path = addSpaceIdToPath(baseUrl, spaceId, ALERTS_PATH);
    const url = new URL(path);
    url.search = search;

    return {
      app: 'observability',
      path: url.href,
      state: {},
    };
  };
}
