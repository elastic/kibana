/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { z } from '@kbn/zod';
import type {
  EqlRuleCreateFields,
  QueryRuleCreateFields,
  SavedQueryRuleCreateFields,
  ThresholdRuleCreateFields,
  ThreatMatchRuleCreateFields,
  MachineLearningRuleCreateFields,
  NewTermsRuleCreateFields,
  EsqlRuleCreateFields,
  TypeSpecificCreatePropsInternal,
} from '../../../../../../common/api/detection_engine';
import { PrebuiltRuleAsset, type PrebuiltAssetBaseProps } from './prebuilt_rule_asset';

type TypeSpecificCreateProps = z.infer<typeof TypeSpecificCreatePropsInternal>;

export const getPrebuiltRuleMock = (rewrites?: Partial<PrebuiltRuleAsset>): PrebuiltRuleAsset => {
  return PrebuiltRuleAsset.parse({
    description: 'some description',
    name: 'Query with a rule id',
    query: 'user.name: root or user.name: admin',
    severity: 'high',
    type: 'query',
    risk_score: 55,
    language: 'kuery',
    rule_id: 'rule-1',
    version: 1,
    author: [],
    license: 'Elastic License v2',
    ...rewrites,
  });
};

export const getPrebuiltQueryRuleSpecificFieldsMock = (): QueryRuleCreateFields => ({
  type: 'query',
  query: 'user.name: root or user.name: admin',
  language: 'kuery',
});

export const getPrebuiltEqlRuleSpecificFieldsMock = (): EqlRuleCreateFields => ({
  type: 'eql',
  query: 'process where process.name == "cmd.exe"',
  language: 'eql',
});

export const getPrebuiltSavedQueryRuleSpecificFieldsMock = (): SavedQueryRuleCreateFields => ({
  type: 'saved_query',
  saved_id: 'saved-query-id',
});

export const getPrebuiltThresholdRuleSpecificFieldsMock = (): ThresholdRuleCreateFields => ({
  type: 'threshold',
  query: 'user.name: root or user.name: admin',
  language: 'kuery',
  threshold: {
    field: 'user.name',
    value: 5,
  },
});

export const getPrebuiltThreatMatchRuleSpecificFieldsMock = (): ThreatMatchRuleCreateFields => ({
  type: 'threat_match',
  query: 'user.name: root or user.name: admin',
  language: 'kuery',
  threat_query: '*:*',
  threat_index: ['list-index'],
  threat_mapping: [
    {
      entries: [
        {
          field: 'host.name',
          value: 'host.name',
          type: 'mapping',
        },
      ],
    },
  ],
  concurrent_searches: 2,
  items_per_search: 10,
});

export const getPrebuiltThreatMatchRuleMock = (): PrebuiltRuleAsset => ({
  description: 'some description',
  name: 'Query with a rule id',
  severity: 'high',
  risk_score: 55,
  rule_id: 'rule-1',
  version: 1,
  author: [],
  license: 'Elastic License v2',
  ...getPrebuiltThreatMatchRuleSpecificFieldsMock(),
});

export const getPrebuiltMachineLearningRuleSpecificFieldsMock =
  (): MachineLearningRuleCreateFields => ({
    type: 'machine_learning',
    anomaly_threshold: 50,
    machine_learning_job_id: 'ml-job-id',
  });

export const getPrebuiltNewTermsRuleSpecificFieldsMock = (): NewTermsRuleCreateFields => ({
  type: 'new_terms',
  query: 'user.name: *',
  language: 'kuery',
  new_terms_fields: ['user.name'],
  history_window_start: '1h',
});

export const getPrebuiltEsqlRuleSpecificFieldsMock = (): EsqlRuleCreateFields => ({
  type: 'esql',
  query: 'from process where process.name == "cmd.exe"',
  language: 'esql',
});

export const getPrebuiltRuleMockOfType = <T extends TypeSpecificCreateProps>(
  type: T['type']
): PrebuiltAssetBaseProps &
  Extract<TypeSpecificCreateProps, T> & { version: number; rule_id: string } => {
  let typeSpecificFields: TypeSpecificCreateProps;

  switch (type) {
    case 'query':
      typeSpecificFields = getPrebuiltQueryRuleSpecificFieldsMock();
      break;
    case 'eql':
      typeSpecificFields = getPrebuiltEqlRuleSpecificFieldsMock();
      break;
    case 'saved_query':
      typeSpecificFields = getPrebuiltSavedQueryRuleSpecificFieldsMock();
      break;
    case 'threshold':
      typeSpecificFields = getPrebuiltThresholdRuleSpecificFieldsMock();
      break;
    case 'threat_match':
      typeSpecificFields = getPrebuiltThreatMatchRuleSpecificFieldsMock();
      break;
    case 'machine_learning':
      typeSpecificFields = getPrebuiltMachineLearningRuleSpecificFieldsMock();
      break;
    case 'new_terms':
      typeSpecificFields = getPrebuiltNewTermsRuleSpecificFieldsMock();
      break;
    case 'esql':
      typeSpecificFields = getPrebuiltEsqlRuleSpecificFieldsMock();
      break;
    default:
      throw new Error(`Unsupported rule type: ${type}`);
  }

  return {
    tags: ['tag1', 'tag2'],
    description: 'some description',
    name: `${type} rule`,
    severity: 'high',
    risk_score: 55,
    author: [],
    license: 'Elastic License v2',
    ...typeSpecificFields,
    rule_id: `rule-${type}`,
    version: 1,
  };
};

export const getPrebuiltRuleWithExceptionsMock = (
  rewrites?: Partial<PrebuiltRuleAsset>
): PrebuiltRuleAsset => {
  const parsedFields = rewrites ? PrebuiltRuleAsset.parse(rewrites) : {};

  return {
    description: 'A rule with an exception list',
    name: 'A rule with an exception list',
    query: 'user.name: root or user.name: admin',
    severity: 'high',
    type: 'query',
    risk_score: 42,
    language: 'kuery',
    rule_id: 'rule-with-exceptions',
    exceptions_list: [
      {
        id: 'endpoint_list',
        list_id: 'endpoint_list',
        namespace_type: 'agnostic',
        type: 'endpoint',
      },
    ],
    version: 2,
    ...parsedFields,
  };
};
