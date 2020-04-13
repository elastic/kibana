/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import mappings from './mappings.json';

export default function(kibana) {
  return new kibana.Plugin({
    require: ['kibana', 'elasticsearch', 'xpack_main'],
    name: 'isolated_type_plugin',
    uiExports: {
      savedObjectsManagement: {
        isolatedtype: {
          isImportableAndExportable: true,
        },
      },
      mappings,
    },

    config() {},

    init() {}, // need empty init for plugin to load
  });
}
