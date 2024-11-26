/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERT_DURATION,
  ALERT_END,
  ALERT_INSTANCE_ID,
  ALERT_SEVERITY,
  ALERT_RULE_TYPE_ID,
  ALERT_START,
  ALERT_STATUS,
  ALERT_UUID,
  ALERT_RULE_UUID,
  ALERT_RULE_NAME,
  ALERT_RULE_CATEGORY,
  ALERT_RULE_PRODUCER,
  ALERT_STATUS_ACTIVE,
  ALERT_STATUS_RECOVERED,
  ALERT_RULE_CONSUMER,
  SPACE_IDS,
  TIMESTAMP,
} from '@kbn/rule-data-utils';
import type { Alert } from '@kbn/alerting-types';

const createDates = (start: string, duration: number, isEnd?: boolean) => {
  const started = new Date(start);
  const lastTimestamp = new Date(started.valueOf() + duration);
  const dates = {
    [TIMESTAMP]: lastTimestamp.toISOString(),
    [ALERT_START]: started.toISOString(),
    [ALERT_DURATION]: duration,
  };
  if (isEnd) {
    return { ...dates, [ALERT_END]: lastTimestamp.toISOString() };
  }
  return dates;
};

export const apmAlertResponseExample = [
  {
    [ALERT_RULE_TYPE_ID]: ['apm.error_rate'],
    'service.name': ['opbeans-java'],
    [ALERT_RULE_NAME]: ['Error count threshold | opbeans-java (smith test)'],
    [ALERT_RULE_CONSUMER]: ['apm'],
    [SPACE_IDS]: ['default'],
    [ALERT_STATUS]: [ALERT_STATUS_ACTIVE],
    [ALERT_SEVERITY]: ['warning'],
    tags: ['apm', 'service.name:opbeans-java'],
    [ALERT_UUID]: ['0175ec0a-a3b1-4d41-b557-e21c2d024352'],
    [ALERT_RULE_UUID]: ['474920d0-93e9-11eb-ac86-0b455460de81'],
    'event.action': ['active'],
    [ALERT_INSTANCE_ID]: ['apm.error_rate_opbeans-java_production'],
    [ALERT_RULE_PRODUCER]: ['apm'],
    'event.kind': ['state'],
    [ALERT_RULE_CATEGORY]: ['Error count threshold'],
    'service.environment': ['production'],
    'processor.event': ['error'],
    ...createDates('2021-04-12T13:50:49.493Z', 180057000),
  },
  {
    [ALERT_RULE_TYPE_ID]: ['apm.error_rate'],
    'service.name': ['opbeans-java'],
    [ALERT_RULE_NAME]: ['Error count threshold | opbeans-java (smith test)'],
    [ALERT_RULE_CONSUMER]: ['apm'],
    [SPACE_IDS]: ['default'],
    [ALERT_STATUS]: [ALERT_STATUS_RECOVERED],
    tags: ['apm', 'service.name:opbeans-java'],
    [ALERT_UUID]: ['32b940e1-3809-4c12-8eee-f027cbb385e2'],
    [ALERT_RULE_UUID]: ['474920d0-93e9-11eb-ac86-0b455460de81'],
    'event.action': ['close'],
    [ALERT_INSTANCE_ID]: ['apm.error_rate_opbeans-java_production'],
    [ALERT_RULE_PRODUCER]: ['apm'],
    'event.kind': ['state'],
    [ALERT_RULE_CATEGORY]: ['Error count threshold'],
    'service.environment': ['production'],
    'processor.event': ['error'],
    ...createDates('2021-04-12T13:09:30.441Z', 2419005000, true),
  },
] as unknown as Alert[];

export const dynamicIndexPattern = {
  fields: [
    {
      name: TIMESTAMP,
      type: 'date',
      esTypes: ['date'],
      searchable: true,
      aggregatable: true,
      readFromDocValues: true,
    },
    {
      name: 'event.action',
      type: 'string',
      esTypes: ['keyword'],
      searchable: true,
      aggregatable: true,
      readFromDocValues: true,
    },
    {
      name: 'event.kind',
      type: 'string',
      esTypes: ['keyword'],
      searchable: true,
      aggregatable: true,
      readFromDocValues: true,
    },
    {
      name: 'host.name',
      type: 'string',
      esTypes: ['keyword'],
      searchable: true,
      aggregatable: true,
      readFromDocValues: true,
    },
    {
      name: ALERT_DURATION,
      type: 'number',
      esTypes: ['long'],
      searchable: true,
      aggregatable: true,
      readFromDocValues: true,
    },
    {
      name: ALERT_END,
      type: 'date',
      esTypes: ['date'],
      searchable: true,
      aggregatable: true,
      readFromDocValues: true,
    },
    {
      name: ALERT_INSTANCE_ID,
      type: 'string',
      esTypes: ['keyword'],
      searchable: true,
      aggregatable: true,
      readFromDocValues: true,
    },
    {
      name: ALERT_SEVERITY,
      type: 'string',
      esTypes: ['keyword'],
      searchable: true,
      aggregatable: true,
      readFromDocValues: true,
    },
    {
      name: ALERT_START,
      type: 'date',
      esTypes: ['date'],
      searchable: true,
      aggregatable: true,
      readFromDocValues: true,
    },
    {
      name: ALERT_STATUS,
      type: 'string',
      esTypes: ['keyword'],
      searchable: true,
      aggregatable: true,
      readFromDocValues: true,
    },
    {
      name: ALERT_UUID,
      type: 'string',
      esTypes: ['keyword'],
      searchable: true,
      aggregatable: true,
      readFromDocValues: true,
    },
    {
      name: [ALERT_RULE_PRODUCER],
      type: 'string',
      esTypes: ['keyword'],
      searchable: true,
      aggregatable: true,
      readFromDocValues: true,
    },
    {
      name: 'processor.event',
      type: 'string',
      esTypes: ['keyword'],
      searchable: true,
      aggregatable: true,
      readFromDocValues: true,
    },
    {
      name: [ALERT_RULE_CATEGORY],
      type: 'string',
      esTypes: ['keyword'],
      searchable: true,
      aggregatable: true,
      readFromDocValues: true,
    },
    {
      name: [ALERT_RULE_TYPE_ID],
      type: 'string',
      esTypes: ['keyword'],
      searchable: true,
      aggregatable: true,
      readFromDocValues: true,
    },
    {
      name: [ALERT_RULE_NAME],
      type: 'string',
      esTypes: ['keyword'],
      searchable: true,
      aggregatable: true,
      readFromDocValues: true,
    },
    {
      name: [ALERT_RULE_UUID],
      type: 'string',
      esTypes: ['keyword'],
      searchable: true,
      aggregatable: true,
      readFromDocValues: true,
    },
    {
      name: 'service.environment',
      type: 'string',
      esTypes: ['keyword'],
      searchable: true,
      aggregatable: true,
      readFromDocValues: true,
    },
    {
      name: 'service.name',
      type: 'string',
      esTypes: ['keyword'],
      searchable: true,
      aggregatable: true,
      readFromDocValues: true,
    },
    {
      name: 'tags',
      type: 'string',
      esTypes: ['keyword'],
      searchable: true,
      aggregatable: true,
      readFromDocValues: true,
    },
    {
      name: 'transaction.type',
      type: 'string',
      esTypes: ['keyword'],
      searchable: true,
      aggregatable: true,
      readFromDocValues: true,
    },
  ],
  timeFieldName: TIMESTAMP,
  title: '.kibana_smith-alerts-observability*',
};
