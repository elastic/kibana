/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { FieldCapsResponse } from '@elastic/elasticsearch/lib/api/types';
import type { RuleExecutorServicesMock } from '@kbn/alerting-plugin/server/mocks';
import { alertsMock } from '@kbn/alerting-plugin/server/mocks';
import { ruleExecutionLogMock } from '../../../rule_monitoring/mocks';

import {
  getAllowedFieldForTermQueryFromMapping,
  getAllowedFieldsForTermQuery,
} from './get_allowed_fields_for_terms_query';

const fieldsCapsResponse: FieldCapsResponse = {
  indices: ['source-index', 'other-source-index'],
  fields: {
    'url.full': {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    'host.name': {
      keyword: {
        type: 'keyword',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    'host.ip': {
      ip: {
        type: 'ip',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
      },
    },
    'source.range': {
      ip_range: {
        type: 'ip_range',
        metadata_field: false,
        searchable: true,
        aggregatable: true,
        indices: ['source-index'],
      },
    },
  },
};

describe('get_allowed_fields_for_terms_query copy', () => {
  describe('getAllowedFieldForTermQueryFromMapping', () => {
    it('should return map of fields allowed for term query', () => {
      const result = getAllowedFieldForTermQueryFromMapping(fieldsCapsResponse, [
        'host.ip',
        'url.full',
        'host.name',
        'source.range',
      ]);
      expect(result).toEqual({
        'host.ip': true,
        'url.full': true,
        'host.name': true,
      });
    });
    it('should disable fields if in one index type not supported', () => {
      const result = getAllowedFieldForTermQueryFromMapping(
        {
          ...fieldsCapsResponse,
          fields: {
            ...fieldsCapsResponse.fields,
            'host.name': {
              ...fieldsCapsResponse.fields['host.name'],
              text: {
                type: 'text',
                metadata_field: false,
                searchable: true,
                aggregatable: true,
                indices: ['new-source-index'],
              },
            },
          },
        },
        ['host.ip', 'url.full', 'host.name', 'source.range']
      );
      expect(result).toEqual({
        'host.ip': true,
        'url.full': true,
      });
    });
  });

  describe('getlAllowedFieldsForTermQuery', () => {
    let alertServices: RuleExecutorServicesMock;
    let ruleExecutionLogger: ReturnType<typeof ruleExecutionLogMock.forExecutors.create>;

    beforeEach(() => {
      alertServices = alertsMock.createRuleExecutorServices();
      alertServices.scopedClusterClient.asCurrentUser.fieldCaps.mockResolvedValue(
        fieldsCapsResponse
      );
      ruleExecutionLogger = ruleExecutionLogMock.forExecutors.create();
    });

    it('should return map of fields allowed for term query for source and threat indices', async () => {
      const threatMatchedFields = {
        source: ['host.name', 'url.full', 'host.ip'],
        threat: ['host.name', 'url.full', 'host.ip'],
      };
      const threatIndex = ['threat-index'];
      const inputIndex = ['source-index'];

      const result = await getAllowedFieldsForTermQuery({
        threatMatchedFields,
        services: alertServices,
        threatIndex,
        inputIndex,
        ruleExecutionLogger,
      });
      expect(result).toEqual({
        source: {
          'host.ip': true,
          'url.full': true,
          'host.name': true,
        },
        threat: {
          'host.ip': true,
          'url.full': true,
          'host.name': true,
        },
      });
    });
  });
});
