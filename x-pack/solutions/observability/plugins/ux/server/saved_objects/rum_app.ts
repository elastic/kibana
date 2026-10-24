/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { SavedObjectsType } from '@kbn/core/server';
import {
  DEFAULT_BRANCH_MAX_LENGTH,
  ISSUE_LABELS_MAX_LENGTH,
  REPOSITORY_URL_MAX_LENGTH,
  RUM_APP_SERVICE_NAME_MAX_LENGTH,
  RUM_APP_SETTINGS_SO_TYPE,
  SOURCE_ROOT_MAX_LENGTH,
} from '../../common/rum_app_settings';

const attributesSchema = schema.object({
  serviceName: schema.string({ maxLength: RUM_APP_SERVICE_NAME_MAX_LENGTH }),
  repositoryUrl: schema.string({ maxLength: REPOSITORY_URL_MAX_LENGTH }),
  defaultBranch: schema.string({ maxLength: DEFAULT_BRANCH_MAX_LENGTH }),
  sourceRoot: schema.string({ maxLength: SOURCE_ROOT_MAX_LENGTH }),
  issueLabels: schema.string({ maxLength: ISSUE_LABELS_MAX_LENGTH }),
});

export const rumAppSavedObjectType: SavedObjectsType = {
  name: RUM_APP_SETTINGS_SO_TYPE,
  hidden: false,
  hiddenFromHttpApis: true,
  namespaceType: 'single',
  mappings: {
    dynamic: false,
    properties: {
      serviceName: { type: 'keyword', ignore_above: RUM_APP_SERVICE_NAME_MAX_LENGTH },
    },
  },
  modelVersions: {
    1: {
      changes: [],
      schemas: {
        forwardCompatibility: attributesSchema.extends({}, { unknowns: 'ignore' }),
        create: attributesSchema,
      },
    },
  },
};
