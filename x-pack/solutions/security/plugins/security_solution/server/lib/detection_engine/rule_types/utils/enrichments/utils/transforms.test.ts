/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { applyEnrichmentsToEvents, mergeEnrichments } from './transforms';
import { ruleExecutionLogMock } from '../../../../rule_monitoring/mocks';
import { createAlert } from '../__mocks__/alerts';
import type { EnrichmentFunction } from '../types';
import { set } from '@kbn/safer-lodash-set';

const createEnrichment =
  (field: string, value: string): EnrichmentFunction =>
  (event) => {
    set(event, field, value);
    return event;
  };
describe('applyEnrichmentsToEvents', () => {
  let ruleExecutionLogger: ReturnType<typeof ruleExecutionLogMock.forExecutors.create>;

  beforeEach(() => {
    ruleExecutionLogger = ruleExecutionLogMock.forExecutors.create();
  });

  it('return events if there no enrichments', () => {
    expect(
      applyEnrichmentsToEvents({
        events: [createAlert('1')],
        enrichmentsList: [],
        logger: ruleExecutionLogger,
      })
    ).toEqual([createAlert('1')]);
  });

  it('return enriched events', () => {
    expect(
      applyEnrichmentsToEvents({
        events: [createAlert('1'), createAlert('2'), createAlert('3')],
        enrichmentsList: [
          {
            1: [
              createEnrichment('host.risk.calculated_level', 'low'),
              createEnrichment('enrichedField', '1'),
            ],
            2: [createEnrichment('host.risk.calculated_level', '1')],
          },
          {
            1: [
              createEnrichment('host.risk.other_field', '10'),
              createEnrichment('enrichedField2', '2'),
            ],
          },
        ],
        logger: ruleExecutionLogger,
      })
    ).toEqual([
      {
        ...createAlert('1'),
        enrichedField: '1',
        enrichedField2: '2',
        host: {
          risk: {
            calculated_level: 'low',
            other_field: '10',
          },
        },
      },
      {
        ...createAlert('2'),
        host: {
          risk: {
            calculated_level: '1',
          },
        },
      },
      createAlert('3'),
    ]);
  });
});

describe('mergeEnrichments', () => {
  it('return empty object, if enrichments are empty array', () => {
    expect(mergeEnrichments([])).toEqual({});
  });

  it('merge enrichemnts into single map', () => {
    const fnA = createEnrichment('', '');
    const fnB = createEnrichment('', '');
    const fnC = createEnrichment('', '');
    expect(
      mergeEnrichments([
        {
          1: [fnA, fnB],
          3: [fnC],
        },
        {
          1: [fnA, fnC],
          2: [fnC],
        },
      ])
    ).toEqual({
      1: [fnA, fnB, fnA, fnC],
      2: [fnC],
      3: [fnC],
    });
  });
});
