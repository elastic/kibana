/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const defaultOriginalDashboardExports = {
  preview: false,
  result: {
    id: 'some_id',
    label: 'Sample Dashboard label',
    title: 'sample_dashboard_label',
    description: 'Description of a Sample Dashboard',
    'eai:data':
      '<view template="some_template:/templates/udf_generic.html" type="html">\n  <label>Sample Dashboard</label>\n  <description>Description of Sample Dashboard</description>\n</view>',
    'eai:acl.app': 'SomeApp',
    'eai:acl.sharing': 'global',
    'eai:acl.owner': 'nobody',
    updated: '2025-07-23T14:33:10+00:00',
  },
};
