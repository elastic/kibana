/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_RULE_EXECUTION_UUID } from '@kbn/rule-data-utils';
import { omit } from 'lodash/fp';

import { isMissingRequiredFields } from '.';
import { getResponseMock } from '../../../../../../__mocks__/attack_discovery_alert_document_response';
import {
  ALERT_ATTACK_DISCOVERY_ALERT_IDS,
  ALERT_ATTACK_DISCOVERY_ALERTS_CONTEXT_COUNT,
  ALERT_ATTACK_DISCOVERY_API_CONFIG,
  ALERT_ATTACK_DISCOVERY_DETAILS_MARKDOWN,
  ALERT_ATTACK_DISCOVERY_SUMMARY_MARKDOWN,
  ALERT_ATTACK_DISCOVERY_TITLE,
} from '../../../../schedules/fields/field_names';

describe('isMissingRequiredFields', () => {
  const getHit = () => {
    const mock = getResponseMock();

    const hit = mock.hits.hits[0];
    return {
      ...hit,
      _source: hit._source ? { ...hit._source } : hit._source,
    };
  };

  it('returns false for a valid document', () => {
    const hit = getHit();

    expect(isMissingRequiredFields(hit)).toBe(false);
  });

  it('returns true if _source is null', () => {
    const hit = getHit();
    // Simulate _source being undefined while keeping the rest of the shape
    const hitWithUndefinedSource = { ...hit };
    delete hitWithUndefinedSource._source;

    expect(isMissingRequiredFields(hitWithUndefinedSource)).toBe(true);
  });

  it('returns true if @timestamp is missing', () => {
    let hit = getHit();
    if (hit._source) {
      hit = {
        ...hit,
        _source: omit(['@timestamp'], hit._source) as typeof hit._source,
      };
    }

    expect(isMissingRequiredFields(hit)).toBe(true);
  });

  it('returns true if ALERT_ATTACK_DISCOVERY_ALERT_IDS is not an array', () => {
    const hit = getHit();
    if (hit._source) {
      // @ts-expect-error: testing invalid type
      hit._source[ALERT_ATTACK_DISCOVERY_ALERT_IDS] = undefined;
    }

    expect(isMissingRequiredFields(hit as typeof hit)).toBe(true);
  });

  it('returns true if ALERT_ATTACK_DISCOVERY_ALERT_IDS is not an array (string)', () => {
    const hit = getHit();
    if (hit._source) {
      // @ts-expect-error: testing invalid type
      hit._source[ALERT_ATTACK_DISCOVERY_ALERT_IDS] = 'not-an-array';
    }

    expect(isMissingRequiredFields(hit as typeof hit)).toBe(true);
  });

  it('returns true if ALERT_ATTACK_DISCOVERY_ALERTS_CONTEXT_COUNT is missing', () => {
    let hit = getHit();
    if (hit._source) {
      hit = {
        ...hit,
        _source: omit(
          [ALERT_ATTACK_DISCOVERY_ALERTS_CONTEXT_COUNT],
          hit._source
        ) as typeof hit._source,
      };
    }

    expect(isMissingRequiredFields(hit)).toBe(true);
  });

  it('returns true if ALERT_ATTACK_DISCOVERY_API_CONFIG is missing', () => {
    let hit = getHit();
    if (hit._source) {
      hit = {
        ...hit,
        _source: omit([ALERT_ATTACK_DISCOVERY_API_CONFIG], hit._source) as typeof hit._source,
      };
    }

    expect(isMissingRequiredFields(hit)).toBe(true);
  });

  it('returns true if ALERT_ATTACK_DISCOVERY_API_CONFIG.action_type_id is missing', () => {
    let hit = getHit();
    if (hit._source && hit._source[ALERT_ATTACK_DISCOVERY_API_CONFIG]) {
      hit = {
        ...hit,
        _source: {
          ...hit._source,
          [ALERT_ATTACK_DISCOVERY_API_CONFIG]: omit(
            ['action_type_id'],
            hit._source[ALERT_ATTACK_DISCOVERY_API_CONFIG]
          ) as (typeof hit._source)[typeof ALERT_ATTACK_DISCOVERY_API_CONFIG],
        },
      };
    }

    expect(isMissingRequiredFields(hit)).toBe(true);
  });

  it('returns true if ALERT_ATTACK_DISCOVERY_API_CONFIG.connector_id is missing', () => {
    let hit = getHit();
    if (hit._source && hit._source[ALERT_ATTACK_DISCOVERY_API_CONFIG]) {
      hit = {
        ...hit,
        _source: {
          ...hit._source,
          [ALERT_ATTACK_DISCOVERY_API_CONFIG]: omit(
            ['connector_id'],
            hit._source[ALERT_ATTACK_DISCOVERY_API_CONFIG]
          ) as (typeof hit._source)[typeof ALERT_ATTACK_DISCOVERY_API_CONFIG],
        },
      };
    }

    expect(isMissingRequiredFields(hit)).toBe(true);
  });

  it('returns true if ALERT_ATTACK_DISCOVERY_API_CONFIG.name is missing', () => {
    let hit = getHit();
    if (hit._source && hit._source[ALERT_ATTACK_DISCOVERY_API_CONFIG]) {
      hit = {
        ...hit,
        _source: {
          ...hit._source,
          [ALERT_ATTACK_DISCOVERY_API_CONFIG]: omit(
            ['name'],
            hit._source[ALERT_ATTACK_DISCOVERY_API_CONFIG]
          ) as (typeof hit._source)[typeof ALERT_ATTACK_DISCOVERY_API_CONFIG],
        },
      };
    }

    expect(isMissingRequiredFields(hit)).toBe(true);
  });

  it('returns true if ALERT_ATTACK_DISCOVERY_DETAILS_MARKDOWN is missing', () => {
    let hit = getHit();
    if (hit._source) {
      hit = {
        ...hit,
        _source: omit([ALERT_ATTACK_DISCOVERY_DETAILS_MARKDOWN], hit._source) as typeof hit._source,
      };
    }

    expect(isMissingRequiredFields(hit)).toBe(true);
  });

  it('returns true if ALERT_RULE_EXECUTION_UUID is missing', () => {
    let hit = getHit();
    if (hit._source) {
      hit = {
        ...hit,
        _source: omit([ALERT_RULE_EXECUTION_UUID], hit._source) as typeof hit._source,
      };
    }
    expect(isMissingRequiredFields(hit)).toBe(true);
  });

  it('returns true if _id is missing', () => {
    let hit = getHit();
    hit = omit(['_id'], hit) as typeof hit;

    expect(isMissingRequiredFields(hit)).toBe(true);
  });

  it('returns true if ALERT_ATTACK_DISCOVERY_SUMMARY_MARKDOWN is missing', () => {
    let hit = getHit();
    if (hit._source) {
      hit = {
        ...hit,
        _source: omit([ALERT_ATTACK_DISCOVERY_SUMMARY_MARKDOWN], hit._source) as typeof hit._source,
      };
    }

    expect(isMissingRequiredFields(hit)).toBe(true);
  });

  it('returns true if ALERT_ATTACK_DISCOVERY_TITLE is missing', () => {
    let hit = getHit();
    if (hit._source) {
      hit = {
        ...hit,
        _source: omit([ALERT_ATTACK_DISCOVERY_TITLE], hit._source) as typeof hit._source,
      };
    }

    expect(isMissingRequiredFields(hit)).toBe(true);
  });
});
