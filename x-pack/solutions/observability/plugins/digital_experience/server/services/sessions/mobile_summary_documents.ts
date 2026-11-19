/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { numberOr, stringOrNull } from '../../lib/helpers/values';
import type { MobileSessionDocument } from './mobile_sessions_index';
import type { MobileSessionAttribute } from './mobile_summary_queries';
import { searchValues, type EsqlRow } from './summary_documents';
import { attributeColumn } from './summary_queries';

const attributeOf = (row: EsqlRow, attribute: MobileSessionAttribute): string | null =>
  stringOrNull(row[attributeColumn(attribute)]);

/** One summary per row of the mobile summary query. */
export const toMobileSessionDocuments = (rows: EsqlRow[]): MobileSessionDocument[] =>
  rows.flatMap((row) => {
    const serviceName = stringOrNull(row.service);
    const sessionId = stringOrNull(row.session);
    const startTime = stringOrNull(row.start_time);
    const endTime = stringOrNull(row.end_time);
    if (!serviceName || !sessionId || !startTime || !endTime) {
      return [];
    }
    const durationMs = Math.max(0, Date.parse(endTime) - Date.parse(startTime));
    const user = attributeOf(row, 'user');
    const appVersion = attributeOf(row, 'appVersion');
    const deviceModel = attributeOf(row, 'deviceModel');
    const os = attributeOf(row, 'os');
    const osVersion = attributeOf(row, 'osVersion');
    const countryIso = attributeOf(row, 'countryIso');
    const city = attributeOf(row, 'city');

    return [
      {
        session: { id: sessionId },
        service: { name: serviceName },
        start_time: startTime,
        end_time: endTime,
        duration_ms: Number.isFinite(durationMs) ? durationMs : 0,
        event_count: numberOr(row.event_count, 0),
        crash_count: numberOr(row.crash_count, 0),
        screen_view_count: numberOr(row.screen_view_count, 0),
        tap_count: numberOr(row.tap_count, 0),
        http_request_count: numberOr(row.http_request_count, 0),
        http_failed_request_count: numberOr(row.http_failed_request_count, 0),
        environment: attributeOf(row, 'environment'),
        user: { key: user },
        app: { version: appVersion, build_id: attributeOf(row, 'appBuildId') },
        device: { model: deviceModel, manufacturer: attributeOf(row, 'deviceManufacturer') },
        os: { name: os, version: osVersion },
        network: { connection_type: attributeOf(row, 'networkConnectionType') },
        geo: { country_iso: countryIso, region: attributeOf(row, 'region'), city },
        search: searchValues([
          sessionId,
          user,
          appVersion,
          deviceModel,
          os,
          osVersion,
          countryIso,
          city,
        ]),
      },
    ];
  });
