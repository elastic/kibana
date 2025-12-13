/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { SavedObjectsType } from '@kbn/core-saved-objects-server';
import type { SavedObject } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import { pick } from 'lodash';
import type { StoredSLODefinitionTemplate } from '../domain/models/template';

export const SO_SLO_TEMPLATE_TYPE = 'slo_template';

/**
 * We will use the savedObject.id as the template identifier when
 * creating SLOs from templates (create?fromTemplateId=xxxx), so no need to have a separate field
 * in the attributes like we have for SLOs.
 */
export const sloTemplate: SavedObjectsType = {
  name: SO_SLO_TEMPLATE_TYPE,
  hidden: true,
  namespaceType: 'multiple-isolated',
  modelVersions: {
    '1': {
      changes: [],
      schemas: {
        forwardCompatibility: (attributes) => {
          const fields = [
            'name',
            'description',
            'indicator',
            'budgetingMethod',
            'objective',
            'timeWindow',
            'tags',
            'settings',
          ];
          return pick(attributes, fields);
        },
        create: schema.object({}, { unknowns: 'allow' }),
      },
    },
  },
  mappings: {
    dynamic: false,
    properties: {
      name: {
        type: 'text',
        fields: {
          keyword: {
            type: 'keyword',
            normalizer: 'lowercase',
          },
        },
      },
      tags: { type: 'keyword' },
    },
  },
  management: {
    importableAndExportable: true,
    getTitle(template: SavedObject<StoredSLODefinitionTemplate>) {
      return i18n.translate('xpack.slo.sloTemplateSaveObject.title', {
        defaultMessage: 'SLO Template: {name}',
        values: { name: template.attributes.name ?? 'Unnamed' },
      });
    },
  },
};
