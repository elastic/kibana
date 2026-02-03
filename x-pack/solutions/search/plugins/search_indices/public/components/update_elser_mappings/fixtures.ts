/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingProperty } from '@elastic/elasticsearch/lib/api/types';
import type { EuiSelectableOption } from '@elastic/eui';
import {
  ELSER_ON_EIS_INFERENCE_ENDPOINT_ID,
  ELSER_ON_ML_NODE_INFERENCE_ENDPOINT_ID,
} from '../../constants';
import type { MappingsOptionData, NormalizedFields } from './types';

export const flattenedFields: NormalizedFields['byId'] = {
  '1': {
    id: '1',
    path: ['address'],
    source: {
      name: 'address',
      type: 'semantic_text',
      inference_id: ELSER_ON_EIS_INFERENCE_ENDPOINT_ID,
    },
    hasChildFields: false,
  },
  '2': {
    id: '2',
    path: ['animal'],
    source: {
      name: 'animal',
      type: 'object',
    },
    hasChildFields: true,
    childFieldsName: 'properties',
    childFields: ['3', '4', '6'],
  },
  '3': {
    id: '3',
    parentId: '2',
    path: ['animal', 'name'],
    source: {
      name: 'name',
      type: 'semantic_text',
      inference_id: ELSER_ON_ML_NODE_INFERENCE_ENDPOINT_ID,
    },
    hasChildFields: false,
  },
  '4': {
    id: '4',
    parentId: '2',
    path: ['animal', 'owner'],
    source: {
      name: 'owner',
      type: 'object',
    },
    hasChildFields: true,
    childFieldsName: 'properties',
    childFields: ['5'],
  },
  '5': {
    id: '5',
    parentId: '4',
    path: ['animal', 'owner', 'name'],
    source: {
      name: 'name',
      type: 'semantic_text',
      inference_id: ELSER_ON_ML_NODE_INFERENCE_ENDPOINT_ID,
    },
    hasChildFields: false,
  },
  '6': {
    id: '6',
    parentId: '2',
    path: ['animal', 'species'],
    source: {
      name: 'species',
      type: 'semantic_text',
      inference_id: ELSER_ON_ML_NODE_INFERENCE_ENDPOINT_ID,
    },
    hasChildFields: false,
  },
  '7': {
    id: '7',
    path: ['name'],
    source: {
      name: 'name',
      type: 'semantic_text',
      inference_id: ELSER_ON_ML_NODE_INFERENCE_ENDPOINT_ID,
    },
    hasChildFields: false,
  },
};

export const flattenedTextFields: NormalizedFields['byId'] = {
  '1': {
    id: '1',
    path: ['first_name'],
    source: {
      name: 'first_name',
      type: 'text',
    },
    hasChildFields: false,
  },
  '2': {
    id: '2',
    path: ['last_name'],
    source: {
      name: 'last_name',
      type: 'text',
    },
    hasChildFields: false,
  },
};

export const mappings: Record<string, MappingProperty> = {
  address: {
    type: 'semantic_text',
    inference_id: '.elser-2-elastic',
  },
  animal: {
    properties: {
      name: {
        type: 'semantic_text',
        inference_id: '.elser-2-elasticsearch',
      },
      owner: {
        properties: {
          name: {
            type: 'semantic_text',
            inference_id: '.elser-2-elasticsearch',
          },
        },
      },
      species: {
        type: 'semantic_text',
        inference_id: '.elser-2-elasticsearch',
      },
    },
  },
  name: {
    type: 'semantic_text',
    inference_id: '.elser-2-elasticsearch',
  },
};

export const textFieldMappings: Record<string, MappingProperty> = {
  first_name: {
    type: 'text',
  },
  last_name: {
    type: 'text',
  },
};

export const selectedOption: EuiSelectableOption<MappingsOptionData>[] = [
  {
    label: 'animal.owner.name',
    name: 'name',
    key: '5',
    checked: 'on',
  },
];

export const selectedOptionWithChildren: EuiSelectableOption<MappingsOptionData>[] = [
  {
    label: 'animal.name',
    name: 'name',
    key: '3',
    checked: 'on',
  },
];

export const normalizedFields: NormalizedFields = {
  byId: {
    '5': {
      id: '5',
      parentId: '4',
      path: ['animal', 'owner', 'name'],
      source: {
        name: 'name',
        type: 'semantic_text',
        inference_id: '.elser-2-elastic',
      },
      hasChildFields: false,
    },
    '4': {
      id: '4',
      parentId: '2',
      path: ['animal', 'owner'],
      source: {
        name: 'owner',
        type: 'object',
      },
      hasChildFields: true,
      childFieldsName: 'properties',
      childFields: ['5'],
    },
    '2': {
      id: '2',
      path: ['animal'],
      source: {
        name: 'animal',
        type: 'object',
      },
      hasChildFields: true,
      childFieldsName: 'properties',
      childFields: ['4'],
    },
  },
  aliases: {},
  rootLevelFields: ['2'],
};

export const deNormalizedField = {
  animal: {
    type: 'object',
    properties: {
      owner: {
        type: 'object',
        properties: {
          name: {
            type: 'semantic_text',
            inference_id: '.elser-2-elastic',
          },
        },
      },
    },
  },
};
