/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { AttackDiscoveryPostRequestBody } from '@kbn/elastic-assistant-common';

import { mockAnonymizationFields } from '../../../../../lib/attack_discovery/graphs/default_attack_discovery_graph/mock/mock_anonymization_fields';
import { requestIsValid } from '.';

describe('requestIsValid', () => {
  const alertsIndexPattern = '.alerts-security.alerts-default';
  const replacements = { uuid: 'original_value' };
  const size = 20;
  const request = {
    body: {
      actionTypeId: '.bedrock',
      alertsIndexPattern,
      anonymizationFields: mockAnonymizationFields,
      connectorId: 'test-connector-id',
      replacements,
      size,
      subAction: 'invokeAI',
    },
  } as unknown as KibanaRequest<unknown, unknown, AttackDiscoveryPostRequestBody>;

  it('returns false when the request is missing required anonymization parameters', () => {
    const requestMissingAnonymizationParams = {
      body: {
        alertsIndexPattern: '.alerts-security.alerts-default',
        isEnabledKnowledgeBase: false,
        size: 20,
      },
    } as unknown as KibanaRequest<unknown, unknown, AttackDiscoveryPostRequestBody>;

    const params = {
      alertsIndexPattern,
      request: requestMissingAnonymizationParams, // <-- missing required anonymization parameters
      size,
    };

    expect(requestIsValid(params)).toBe(false);
  });

  it('returns false when the alertsIndexPattern is undefined', () => {
    const params = {
      alertsIndexPattern: undefined, // <-- alertsIndexPattern is undefined
      request,
      size,
    };

    expect(requestIsValid(params)).toBe(false);
  });

  it('returns false when size is undefined', () => {
    const params = {
      alertsIndexPattern,
      request,
      size: undefined, // <-- size is undefined
    };

    expect(requestIsValid(params)).toBe(false);
  });

  it('returns false when size is out of range', () => {
    const params = {
      alertsIndexPattern,
      request,
      size: 0, // <-- size is out of range
    };

    expect(requestIsValid(params)).toBe(false);
  });

  it('returns true if all required params are provided', () => {
    const params = {
      alertsIndexPattern,
      request,
      size,
    };

    expect(requestIsValid(params)).toBe(true);
  });
});
