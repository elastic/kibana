/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import mappings from './mappings.json';

export default function (kibana) {
  return new kibana.Plugin({
    require: [],
    name: 'namespace_agnostic_type_plugin',
    uiExports: {
      savedObjectSchemas: {
        globaltype: {
          isNamespaceAgnostic: true
        }
      },
      mappings,
    },

    config() {},
  });
}
