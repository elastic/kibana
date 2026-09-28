/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { estypes } from '@elastic/elasticsearch';
import { transformSearchResponseToAlerts } from './transform_search_response_to_alerts';
import { transformAttackDiscoveryAlertDocumentToApi } from './transform_attack_discovery_alert_document_to_api';

jest.mock('./transform_attack_discovery_alert_document_to_api', () => ({
  transformAttackDiscoveryAlertDocumentToApi: jest.fn(),
}));

describe('transformSearchResponseToAlerts', () => {
  it('returns an empty array when the hit is missing required fields', () => {
    const logger = { warn: jest.fn() } as unknown as Logger;
    const response = {
      hits: {
        hits: [
          {
            _id: 'id-1',
            _source: {
              // Missing required fields on purpose
              'kibana.alert.attack_discovery.alert_ids': ['a1'],
            },
          },
        ],
      },
    } as unknown as estypes.SearchResponse<Record<string, unknown>>;

    expect(
      transformSearchResponseToAlerts({
        enableFieldRendering: true,
        logger,
        response,
        withReplacements: false,
      })
    ).toEqual([]);
  });

  it('returns transformed alerts when the hit has required fields', () => {
    const logger = { warn: jest.fn() } as unknown as Logger;
    const response = {
      hits: {
        hits: [
          {
            _id: 'id-1',
            _source: {
              'kibana.alert.attack_discovery.alert_ids': ['a1'],
              'kibana.alert.attack_discovery.api_config': { connector_id: 'c1', name: 'n1' },
              'kibana.alert.attack_discovery.details_markdown': 'd1',
              'kibana.alert.attack_discovery.summary_markdown': 's1',
              'kibana.alert.attack_discovery.title': 't1',
            },
          },
        ],
      },
    } as unknown as estypes.SearchResponse<Record<string, unknown>>;

    (transformAttackDiscoveryAlertDocumentToApi as jest.Mock).mockReturnValue({ id: 'id-1' });

    expect(
      transformSearchResponseToAlerts({
        enableFieldRendering: true,
        logger,
        response,
        withReplacements: false,
      })
    ).toEqual([{ id: 'id-1' }]);
  });

  it('calls the document transformer with an empty id when the hit id is missing', () => {
    const logger = { warn: jest.fn() } as unknown as Logger;
    const response = {
      hits: {
        hits: [
          {
            _id: undefined,
            _source: {
              'kibana.alert.attack_discovery.alert_ids': ['a1'],
              'kibana.alert.attack_discovery.api_config': { connector_id: 'c1', name: 'n1' },
              'kibana.alert.attack_discovery.details_markdown': 'd1',
              'kibana.alert.attack_discovery.summary_markdown': 's1',
              'kibana.alert.attack_discovery.title': 't1',
            },
          },
        ],
      },
    } as unknown as estypes.SearchResponse<Record<string, unknown>>;

    (transformAttackDiscoveryAlertDocumentToApi as jest.Mock).mockReturnValue({ id: '' });

    transformSearchResponseToAlerts({
      enableFieldRendering: true,
      logger,
      response,
      withReplacements: false,
    });

    expect(transformAttackDiscoveryAlertDocumentToApi).toHaveBeenCalledWith(
      expect.objectContaining({ id: '' })
    );
  });
});
