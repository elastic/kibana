/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OriginalRule } from '../../../../../../common/siem_migrations/model/rule_migration.gen';
import { getElasticSeverityFromOriginalRule } from './map_original_rule_severity_elastic';
import { mapSplunkSeverityToElasticSeverity } from './splunk';

const defaultSplunkRule: OriginalRule = {
  id: 'some_id',
  vendor: 'splunk',
  title: 'Sample Alert in Essentials',
  description: '',
  query: 'source="tutorialdata.zip:*"',
  query_language: 'spl',
  severity: '3',
};

jest.mock('./splunk');
const mockMapSplunkSeverityToElasticSeverity = jest.fn();

describe('getElasticSeverityFromOriginalRule', () => {
  beforeEach(() => {
    (mapSplunkSeverityToElasticSeverity as jest.Mock).mockImplementation(
      mockMapSplunkSeverityToElasticSeverity
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('splunk', () => {
    describe('when there is a vendor match', () => {
      it('should call the correct function with the correct severity', () => {
        getElasticSeverityFromOriginalRule(defaultSplunkRule);
        expect(mockMapSplunkSeverityToElasticSeverity).toHaveBeenCalledWith('3');
      });
    });
    describe('when there is no vendor match', () => {
      it('should return default severity when there is no match', () => {
        expect(
          getElasticSeverityFromOriginalRule({
            ...defaultSplunkRule,
            // @ts-expect-error
            vendor: 'not_splunk',
            query_language: 'not_spl',
          })
        ).toEqual('low');
      });

      it('should return default severity when there is no severity', () => {
        getElasticSeverityFromOriginalRule({
          ...defaultSplunkRule,
          severity: undefined,
        });

        expect(mockMapSplunkSeverityToElasticSeverity).toHaveBeenCalledWith(undefined);
      });
    });
  });
});
