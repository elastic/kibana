/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getIndexPattern,
  DEFAULT_INDEX,
  CLOUD_DEFEND_INDEX,
  ENDPOINT_INDEX,
  AUDITBEAT_INDEX,
} from '.';

const ENDPOINT_EVENT_INDEX = '.ds-logs-endpoint.events.process-default';
const CLOUD_DEFEND_EVENT_INDEX = '.ds-logs-cloud_defend.process-default';
const AUDITBEAT_EVENT_INDEX = '.ds-auditbeat-8-14-0-default';
const TEST_CLUSTER = 'aws';

describe('getIndexPattern', () => {
  it('gets endpoint index pattern for events from endpoint', () => {
    expect(getIndexPattern(ENDPOINT_EVENT_INDEX)).toEqual(ENDPOINT_INDEX);
  });

  it('gets cloud_defend index pattern for events from cloud-defend', () => {
    expect(getIndexPattern(CLOUD_DEFEND_EVENT_INDEX)).toEqual(CLOUD_DEFEND_INDEX);
  });

  it('gets auditbeat index pattern for events from auditbeat events ', () => {
    expect(getIndexPattern(AUDITBEAT_EVENT_INDEX)).toEqual(AUDITBEAT_INDEX);
  });

  it('gets logs-* for everything else', () => {
    expect(getIndexPattern('asdfasdfasdf')).toEqual(DEFAULT_INDEX);
  });

  it('preserves the cluster portion of the endpoint event index', () => {
    expect(getIndexPattern(TEST_CLUSTER + ':' + ENDPOINT_EVENT_INDEX)).toEqual(
      TEST_CLUSTER + ':' + ENDPOINT_INDEX
    );
  });
});
