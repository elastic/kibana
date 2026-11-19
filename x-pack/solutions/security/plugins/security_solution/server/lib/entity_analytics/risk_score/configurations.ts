/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { FieldMap } from '@kbn/alerts-as-data-utils';
import { EntityType } from '../../../../common/entity_analytics/types';
import { riskScoreBaseIndexName } from '../../../../common/entity_analytics/risk_engine';

import type { IIndexPatternString } from '../utils/create_datastream';

const commonRiskFields: FieldMap = {
  id_field: {
    type: 'keyword',
    array: false,
    required: false,
  },
  id_value: {
    type: 'keyword',
    array: false,
    required: false,
  },
  score_type: {
    type: 'keyword',
    array: false,
    required: false,
  },
  calculation_run_id: {
    type: 'keyword',
    array: false,
    required: false,
  },
  calculated_level: {
    type: 'keyword',
    array: false,
    required: false,
  },
  calculated_score: {
    type: 'float',
    array: false,
    required: false,
  },
  calculated_score_norm: {
    type: 'float',
    array: false,
    required: false,
  },
  category_1_score: {
    type: 'float',
    array: false,
    required: false,
  },
  category_1_count: {
    type: 'long',
    array: false,
    required: false,
  },
  // Modifiers applied to the score calculation
  modifiers: {
    type: 'object',
    array: true,
    required: false,
  },
  'modifiers.type': {
    type: 'keyword',
    array: false,
    required: false,
  },
  'modifiers.subtype': {
    type: 'keyword',
    array: false,
    required: false,
  },
  'modifiers.modifier_value': {
    type: 'float',
    array: false,
    required: false,
  },
  'modifiers.contribution': {
    type: 'float',
    array: false,
    required: false,
  },
  // Metadata shape is dynamic per modifier type; use flattened for flexibility
  'modifiers.metadata': {
    type: 'flattened',
    array: false,
    required: false,
  },
  inputs: {
    type: 'object',
    array: true,
    required: false,
  },
  related_entities: {
    type: 'object',
    array: true,
    required: false,
  },
  'related_entities.entity_id': {
    type: 'keyword',
    array: false,
    required: false,
  },
  'related_entities.relationship_type': {
    type: 'keyword',
    array: false,
    required: false,
  },
  'inputs.id': {
    type: 'keyword',
    array: false,
    required: false,
  },
  'inputs.index': {
    type: 'keyword',
    array: false,
    required: false,
  },
  'inputs.category': {
    type: 'keyword',
    array: false,
    required: false,
  },
  'inputs.description': {
    type: 'keyword',
    array: false,
    required: false,
  },
  'inputs.risk_score': {
    type: 'float',
    array: false,
    required: false,
  },
  'inputs.timestamp': {
    type: 'date',
    array: false,
    required: false,
  },
  notes: {
    type: 'keyword',
    array: false,
    required: false,
  },
};

const buildIdentityRiskFields = (identifierType: EntityType): FieldMap =>
  Object.keys(commonRiskFields).reduce((fieldMap, key) => {
    const identifierKey = `${identifierType}.risk.${key}`;
    fieldMap[identifierKey] = commonRiskFields[key];
    return fieldMap;
  }, {} as FieldMap);

export const riskScoreFieldMap: FieldMap = {
  '@timestamp': {
    type: 'date',
    array: false,
    required: false,
  },
  'event.ingested': {
    type: 'date',
    array: false,
    required: false,
  },
  'host.name': {
    type: 'keyword',
    array: false,
    required: false,
  },
  'host.risk': {
    type: 'object',
    array: false,
    required: false,
  },
  ...buildIdentityRiskFields(EntityType.host),
  'user.name': {
    type: 'keyword',
    array: false,
    required: false,
  },
  'user.risk': {
    type: 'object',
    array: false,
    required: false,
  },
  ...buildIdentityRiskFields(EntityType.user),
  'service.name': {
    type: 'keyword',
    array: false,
    required: false,
  },
  'service.risk': {
    type: 'object',
    array: false,
    required: false,
  },
  ...buildIdentityRiskFields(EntityType.service),
} as const;

export const mappingComponentName = '.risk-score-mappings';
export const nameSpaceAwareMappingsComponentName = (namespace: string): string => {
  return `${mappingComponentName}-${namespace}`;
};
export const totalFieldsLimit = 1000;

export const getIndexPatternDataStream = (namespace: string): IIndexPatternString => ({
  template: `.${riskScoreBaseIndexName}.${riskScoreBaseIndexName}-${namespace}-index-template`,
  alias: `${riskScoreBaseIndexName}.${riskScoreBaseIndexName}-${namespace}`,
});

export const getIndexPatternLookup = (namespace: string): IIndexPatternString => ({
  template: `.entity_analytics.risk_score.lookup-${namespace}-index-template`,
  alias: `.entity_analytics.risk_score.lookup-${namespace}`,
});
