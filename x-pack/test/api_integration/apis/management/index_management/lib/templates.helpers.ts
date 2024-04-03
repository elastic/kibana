/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TemplateDeserialized, TemplateSerialized } from '@kbn/index-management-plugin/common';
import { FtrProviderContext } from '../../../../ftr_provider_context';
import { INDEX_PATTERNS } from '../constants';

const templateMock = {
  settings: {
    number_of_shards: 1,
  },
  mappings: {
    _source: {
      enabled: false,
    },
    properties: {
      host_name: {
        type: 'keyword',
      },
      created_at: {
        type: 'date',
        format: 'EEE MMM dd HH:mm:ss Z yyyy',
      },
    },
  },
  aliases: {
    alias1: {},
  },
};
export function templatesHelpers(getService: FtrProviderContext['getService']) {
  const es = getService('es');

  const catTemplate = (name: string) => es.cat.templates({ name, format: 'json' }, { meta: true });

  const getTemplatePayload = (
    name: string,
    indexPatterns: string[] = INDEX_PATTERNS,
    isLegacy: boolean = false
  ) => {
    const baseTemplate: TemplateDeserialized = {
      name,
      indexPatterns,
      version: 1,
      template: { ...templateMock },
      _kbnMeta: {
        isLegacy,
        type: 'default',
        hasDatastream: false,
      },
      allowAutoCreate: 'NO_OVERWRITE',
    };

    if (isLegacy) {
      baseTemplate.order = 1;
    } else {
      baseTemplate.priority = 1;
    }

    return baseTemplate;
  };

  const getSerializedTemplate = (indexPatterns: string[] = INDEX_PATTERNS): TemplateSerialized => {
    return {
      index_patterns: indexPatterns,
      template: { ...templateMock },
    };
  };

  return {
    catTemplate,
    getTemplatePayload,
    getSerializedTemplate,
  };
}
