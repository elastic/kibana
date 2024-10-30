/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DETECTION_ENGINE_RULES_BULK_ACTION,
  DETECTION_ENGINE_RULES_URL,
} from '@kbn/security-solution-plugin/common/constants';
import { APIRequestContext } from '@playwright/test';
import { getRuleForAlertTesting } from '../../common/utils/security_solution';
import { getCommonHeadersWithApiVersion } from './headers';

const indexes = [
  'apm-*-transaction*',
  'auditbeat-*',
  'endgame-*',
  'filebeat-*',
  'logs-*',
  'packetbeat-*',
  'traces-apm*',
  'winlogbeat-*',
  '-*elastic-cloud-logs-*',
];

export const createRule = async (request: APIRequestContext) => {
  const data = getRuleForAlertTesting(indexes);
  const headers = await getCommonHeadersWithApiVersion();
  const response = await request.post(DETECTION_ENGINE_RULES_URL, {
    data,
    headers,
  });

  return await response.json();
};

export const deleteAllRules = async (request: APIRequestContext) => {
  const headers = await getCommonHeadersWithApiVersion();
  const response = await request.post(DETECTION_ENGINE_RULES_BULK_ACTION, {
    data: {
      query: '',
      action: 'delete',
    },
    headers,
  });

  return await response.json();
};
