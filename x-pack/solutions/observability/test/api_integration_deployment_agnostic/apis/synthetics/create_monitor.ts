/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The `AddNewMonitorsUI` test suite that used to live here was migrated to Scout:
 * `x-pack/solutions/observability/plugins/synthetics/test/scout/api/tests/create_monitor.spec.ts`.
 *
 * This module is retained as a helpers-only file because `addMonitorAPIHelper`,
 * `keyToOmitList`, and `omitMonitorKeys` are still imported by FTR suites that
 * have not been migrated yet (e.g. `enable_default_alerting`, `get_monitor`,
 * `sync_global_params`, `create_monitor_private_location`, `edit_private_location`,
 * `get_private_location_monitors`).
 */
import expect from '@kbn/expect';
import type { RoleCredentials, SamlAuthProviderType } from '@kbn/ftr-common-functional-services';
import moment from 'moment/moment';
import { omit, omitBy } from 'lodash';
import { SYNTHETICS_API_URLS } from '@kbn/synthetics-plugin/common/constants';
import {
  removeMonitorEmptyValues,
  transformPublicKeys,
} from '@kbn/synthetics-plugin/server/routes/monitor_cruds/formatters/saved_object_to_monitor';

export const addMonitorAPIHelper = async (
  supertestAPI: any,
  monitor: any,
  statusCode = 200,
  roleAuthc: RoleCredentials,
  samlAuth: SamlAuthProviderType,
  gettingStarted?: boolean,
  savedObjectType?: string
) => {
  let queryParams = savedObjectType ? `savedObjectType=${savedObjectType}` : '';
  if (gettingStarted) {
    queryParams = `?gettingStarted=true${queryParams}`;
  } else if (queryParams) {
    queryParams = `?${queryParams}`;
  }

  const result = await supertestAPI
    .post(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS + queryParams)
    .set(roleAuthc.apiKeyHeader)
    .set(samlAuth.getInternalRequestHeader())
    .send(monitor);

  expect(result.statusCode).eql(statusCode, JSON.stringify(result.body));

  if (statusCode === 200) {
    const { created_at: createdAt, updated_at: updatedAt, id, config_id: configId } = result.body;
    expect(id).not.empty();
    expect(configId).not.empty();
    expect([createdAt, updatedAt].map((d) => moment(d).isValid())).eql([true, true]);
    return {
      rawBody: result.body,
      body: {
        ...omit(result.body, ['created_at', 'updated_at', 'id', 'config_id', 'form_monitor_type']),
      },
    };
  }
  return result.body;
};

export const keyToOmitList = [
  'created_at',
  'updated_at',
  'id',
  'config_id',
  'form_monitor_type',
  'spaceId',
  'private_locations',
];

export const omitMonitorKeys = (monitor: any) => {
  return omitBy(omit(transformPublicKeys(monitor), keyToOmitList), removeMonitorEmptyValues);
};
