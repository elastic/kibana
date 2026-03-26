/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { EuiSelectableOption } from '@elastic/eui';
import type { MappingProperty } from '@elastic/elasticsearch/lib/api/types';
import {
  ELSER_ON_EIS_INFERENCE_ENDPOINT_ID,
  ELSER_ON_ML_NODE_INFERENCE_ENDPOINT_ID,
} from '../../constants';
import type { Field, Fields } from '../../../common/types';
import type { MappingNode, MappingsOptionData, NormalizedField, NormalizedFields } from './types';

export const isElserOnMlNodeSemanticField = (field: NormalizedField) =>
  field.source.inference_id === ELSER_ON_ML_NODE_INFERENCE_ENDPOINT_ID;

export function hasElserOnMlNodeSemanticTextField(fields: NormalizedFields['byId']): boolean {
  return Object.values(fields).some(isElserOnMlNodeSemanticField);
}

export function flattenMappings(input: Record<string, MappingProperty>): NormalizedFields['byId'] {
  const result: NormalizedFields['byId'] = {};

  const processMappingNode = (
    node: MappingNode,
    name: string,
    path: string[],
    parentId?: string
  ): string => {
    const id = uuidv4();
    const hasChildren = Boolean(node.properties);

    const entry: NormalizedField = {
      id,
      parentId,
      path,
      source: {
        name,
        type: node.type ?? 'object',
        ...(node.inference_id && { inference_id: node.inference_id }),
      },
      hasChildFields: hasChildren,
    };

    if (hasChildren) {
      entry.childFieldsName = 'properties';
      entry.childFields = [];
    }

    result[id] = entry;

    if (node.properties) {
      for (const [childName, childNode] of Object.entries(node.properties)) {
        const childId = processMappingNode(childNode, childName, [...path, childName], id);
        entry.childFields?.push(childId);
      }
    }

    return id;
  };

  for (const [name, node] of Object.entries(input)) {
    if (isMappingNode(node)) {
      processMappingNode(node, name, [name]);
    }
  }

  return result;
}

function isMappingNode(node: MappingProperty): node is MappingNode {
  return node.type === 'semantic_text' || (typeof node === 'object' && 'properties' in node);
}

export const prepareFieldsForEisUpdate = (
  selectedMappings: EuiSelectableOption<MappingsOptionData>[],
  flattenedMappings: NormalizedFields['byId']
): NormalizedFields => {
  const selectedIds = selectedMappings.flatMap((item) => item.key ?? []);

  const resultById: NormalizedFields['byId'] = {};
  const resultRootLevel: string[] = [];

  function getSelectedFieldData(id: string) {
    // Prevent duplicate processing - if already in resultById, skip
    if (resultById[id]) {
      return;
    }

    const field = flattenedMappings[id];
    if (!field) return;

    const clonedField = { ...field };

    // Only update inference_id if it exists in source
    if (clonedField.source?.inference_id !== undefined) {
      clonedField.source = {
        ...clonedField.source,
        inference_id: ELSER_ON_EIS_INFERENCE_ENDPOINT_ID,
      };
    }
    resultById[id] = clonedField;

    // Include parent if it exists and hasn't been processed yet
    if (field.parentId) {
      if (!resultById[field.parentId]) {
        getSelectedFieldData(field.parentId);
      }
    } else {
      resultRootLevel.push(id);
    }
  }

  selectedIds.forEach((id) => getSelectedFieldData(id));

  // Prune childFields arrays so they only include selected field IDs
  Object.values(resultById).forEach((field) => {
    if (field.childFields) {
      field.childFields = field.childFields.filter((id) => !!resultById[id]);
      if (field.childFields.length === 0) {
        delete field.childFields;
      }
    }
  });

  return {
    byId: resultById,
    aliases: {},
    rootLevelFields: resultRootLevel,
  };
};

export const deNormalize = ({ rootLevelFields, byId }: NormalizedFields): Fields => {
  const deNormalizePaths = (ids: string[], to: Fields = {}): Fields => {
    ids.forEach((id) => {
      const { source, childFields, childFieldsName } = byId[id];
      const { name, ...normalizedField } = source;
      const field: Omit<Field, 'name'> = normalizedField;

      to[name] = field;

      if (childFields && childFieldsName) {
        field[childFieldsName] = {};
        return deNormalizePaths(childFields, field[childFieldsName]);
      }
    });
    return to;
  };

  return deNormalizePaths(rootLevelFields);
};
