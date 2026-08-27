/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getExceptionListItemSchemaMock } from '@kbn/lists-plugin/common/schemas/response/exception_list_item_schema.mock';
import { getQueryRuleParams, getThreatRuleParams } from '../../rule_schema/mocks';
import { getSharedParamsMock } from '../__mocks__/shared_params';
import { getRequestedEventFields } from './get_requested_event_fields';
import { allowedExperimentalValues } from '../../../../../common/experimental_features';

describe('getRequestedEventFields', () => {
  const experimentalFeatures = {
    ...allowedExperimentalValues,
    reducedEventFieldsRequestEnabled: true,
  };

  it('returns undefined when the reducedEventFieldsRequestEnabled experimental feature is off', () => {
    const sharedParams = getSharedParamsMock({ ruleParams: getQueryRuleParams() });

    expect(getRequestedEventFields(sharedParams)).toBeUndefined();
  });

  it('returns undefined for the allFields merge strategy', () => {
    const sharedParams = getSharedParamsMock({
      ruleParams: getQueryRuleParams(),
      rewrites: {
        experimentalFeatures,
        mergeStrategy: 'allFields',
      },
    });

    expect(getRequestedEventFields(sharedParams)).toBeUndefined();
  });

  it('always includes @timestamp and the primary timestamp', () => {
    const sharedParams = getSharedParamsMock({
      ruleParams: getQueryRuleParams(),
      rewrites: {
        experimentalFeatures,
        mergeStrategy: 'missingFields',
        primaryTimestamp: 'event.ingested',
      },
    });

    const fields = getRequestedEventFields(sharedParams);

    expect(fields).toContain('@timestamp');
    expect(fields).toContain('event.ingested');
  });

  it('includes the secondary timestamp when present', () => {
    const sharedParams = getSharedParamsMock({
      ruleParams: getQueryRuleParams(),
      rewrites: {
        experimentalFeatures,
        mergeStrategy: 'missingFields',
        primaryTimestamp: 'event.ingested',
        secondaryTimestamp: '@timestamp',
      },
    });

    expect(getRequestedEventFields(sharedParams)).toEqual(
      expect.arrayContaining(['event.ingested', '@timestamp'])
    );
  });

  it('includes runtime mapping fields', () => {
    const sharedParams = getSharedParamsMock({
      ruleParams: getQueryRuleParams(),
      rewrites: {
        experimentalFeatures,
        mergeStrategy: 'missingFields',
        runtimeMappings: {
          'my.runtime.field': { type: 'keyword' },
        },
      },
    });

    expect(getRequestedEventFields(sharedParams)).toContain('my.runtime.field');
  });

  it('includes alert suppression groupBy fields', () => {
    const sharedParams = getSharedParamsMock({
      ruleParams: getQueryRuleParams({
        alertSuppression: {
          groupBy: ['host.name', 'user.name'],
        },
      }),
      rewrites: {
        experimentalFeatures,
        mergeStrategy: 'missingFields',
      },
    });

    expect(getRequestedEventFields(sharedParams)).toEqual(
      expect.arrayContaining(['host.name', 'user.name'])
    );
  });

  it('includes threat mapping event fields for indicator match rules', () => {
    const sharedParams = getSharedParamsMock({
      ruleParams: getThreatRuleParams({
        threatMapping: [
          {
            entries: [
              {
                field: 'source.ip',
                type: 'mapping',
                value: 'threat.indicator.ip',
              },
              {
                field: 'destination.ip',
                type: 'mapping',
                value: 'threat.indicator.ip',
              },
            ],
          },
        ],
      }),
      rewrites: {
        experimentalFeatures,
        mergeStrategy: 'missingFields',
      },
    });

    const fields = getRequestedEventFields(sharedParams);

    expect(fields).toEqual(expect.arrayContaining(['source.ip', 'destination.ip']));
    expect(fields).not.toContain('threat.indicator.ip');
  });

  it('includes large value list exception fields', () => {
    const exceptionItem = getExceptionListItemSchemaMock();
    exceptionItem.entries = [
      {
        field: 'source.ip',
        operator: 'included',
        type: 'list',
        list: {
          id: 'ci-badguys.txt',
          type: 'ip',
        },
      },
      {
        field: 'host.name',
        operator: 'included',
        type: 'match',
        value: 'some host',
      },
    ];
    const sharedParams = getSharedParamsMock({
      ruleParams: getQueryRuleParams(),
      rewrites: {
        experimentalFeatures,
        mergeStrategy: 'missingFields',
        unprocessedExceptions: [exceptionItem],
      },
    });

    const fields = getRequestedEventFields(sharedParams);

    expect(fields).toContain('source.ip');
    expect(fields).not.toContain('host.name');
  });

  it('includes constant_keyword fields detected from the input indices', () => {
    const sharedParams = getSharedParamsMock({
      ruleParams: getQueryRuleParams(),
      rewrites: {
        experimentalFeatures,
        mergeStrategy: 'missingFields',
        constantKeywordFields: ['data_stream.dataset', 'event.module'],
      },
    });

    expect(getRequestedEventFields(sharedParams)).toEqual(
      expect.arrayContaining(['data_stream.dataset', 'event.module'])
    );
  });

  it('deduplicates fields coming from multiple sources', () => {
    const sharedParams = getSharedParamsMock({
      ruleParams: getQueryRuleParams({
        alertSuppression: {
          groupBy: ['host.name'],
        },
      }),
      rewrites: {
        experimentalFeatures,
        mergeStrategy: 'missingFields',
        constantKeywordFields: ['host.name'],
      },
    });

    const fields = getRequestedEventFields(sharedParams) ?? [];

    expect(fields.filter((field) => field === 'host.name')).toHaveLength(1);
  });
});
