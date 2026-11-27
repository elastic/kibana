/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Connector } from '@kbn/search-connectors';
import { CRAWLER_SERVICE_TYPE, ConnectorStatus } from '@kbn/search-connectors';

import { connectorStatusToText } from './connector_status_helpers';

describe('connectorStatusToText failure label', () => {
  it('names the content crawler for a failed content connector', () => {
    const connector = {
      index_name: 'search-index',
      service_type: 'google_drive',
      status: ConnectorStatus.ERROR,
    } as Connector;

    expect(connectorStatusToText(connector)).toBe('Content crawler failure');
  });

  it('names the crawler for a failed web crawler record', () => {
    const connector = {
      index_name: 'search-crawler',
      service_type: CRAWLER_SERVICE_TYPE,
      status: ConnectorStatus.ERROR,
    } as Connector;

    expect(connectorStatusToText(connector)).toBe('Crawler failure');
  });
});
