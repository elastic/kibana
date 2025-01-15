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
import { logsSettings, logsLifecycle } from './logs_layer';
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
      settings: isRoot(definition.name) ? logsSettings : {},
      lifecycle: isRoot(definition.name) ? logsLifecycle : undefined,
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
