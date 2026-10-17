/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deepFreeze } from '@kbn/std';

/** Index pattern for MS Defender for Endpoint log data (ingested by Microsoft Defender for Endpoint integration */
export const MICROSOFT_DEFENDER_ENDPOINT_LOG_INDEX_PATTERN =
  'logs-microsoft_defender_endpoint.log-*';

export const MICROSOFT_DEFENDER_INDEX_PATTERNS_BY_INTEGRATION = deepFreeze({
  microsoft_defender_endpoint: [MICROSOFT_DEFENDER_ENDPOINT_LOG_INDEX_PATTERN],
  m365_defender: [
    'logs-m365_defender.alert-*',
    'logs-m365_defender.event-*',
    'logs-m365_defender.incident-*',
  ],
});

/**
 * ES fields that can hold the MS Defender for Endpoint machine id. Used by the server to match a
 * requested agent id against MDE log data and m365_defender alert/incident/event data. Note that
 * these can be multi-valued (arrays) in the m365_defender alert and incident data streams.
 */
export const MICROSOFT_DEFENDER_AGENT_ID_FIELDS: Readonly<string[]> = deepFreeze([
  'cloud.instance.id',
  'm365_defender.alert.evidence.mde_device_id',
  'm365_defender.incident.alert.evidence.mde_device_id',
]);
