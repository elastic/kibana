/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ClusterPutComponentTemplateRequest,
  MappingDateProperty,
  MappingProperty,
} from '@elastic/elasticsearch/lib/api/types';
import { WiredStreamDefinition, isRoot } from '@kbn/streams-schema';
import { ASSET_VERSION } from '../../../../common/constants';
import { logsSettings } from './logs_layer';
import { getComponentTemplateName } from './name';

export function generateLayer(
  id: string,
  definition: WiredStreamDefinition
): ClusterPutComponentTemplateRequest {
  const properties: Record<string, MappingProperty> = {};
  Object.entries(definition.stream.ingest.wired.fields).forEach(([field, props]) => {
    const property: MappingProperty = {
      type: props.type,
    };
    if (field === '@timestamp') {
      // @timestamp can't ignore malformed dates as it's used for sorting in logsdb
      (property as MappingDateProperty).ignore_malformed = false;
    }
    if (props.type === 'date' && props.format) {
      (property as MappingDateProperty).format = props.format;
    }
    properties[field] = property;
  });

  return {
    name: getComponentTemplateName(id),
    template: {
      lifecycle: getTemplateLifecycle(definition),
      settings: getTemplateSettings(definition),
      mappings: {
        subobjects: false,
        dynamic: false,
        properties,
      },
    },
    version: ASSET_VERSION,
    _meta: {
      managed: true,
      description: `Default settings for the ${id} stream`,
    },
  };
}

function getTemplateLifecycle(definition: WiredStreamDefinition) {
  if (!definition.stream.ingest.lifecycle || definition.stream.ingest.lifecycle.type === 'ilm') {
    return undefined;
  }

  return { data_retention: definition.stream.ingest.lifecycle.data_retention };
}

function getTemplateSettings(definition: WiredStreamDefinition) {
  if (isRoot(definition.name)) {
    return logsSettings;
  }

  if (!definition.stream.ingest.lifecycle) {
    return undefined;
  }

  if (definition.stream.ingest.lifecycle?.type === 'ilm') {
    return {
      'index.lifecycle.prefer_ilm': true,
      'index.lifecycle.name': definition.stream.ingest.lifecycle.policy,
    };
  }

  return { 'index.lifecycle.prefer_ilm': false, 'index.lifecycle.name': undefined };
}
