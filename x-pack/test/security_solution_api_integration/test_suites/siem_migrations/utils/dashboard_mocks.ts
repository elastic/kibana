/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const defaultOriginalDashboardExports = {
  preview: false,
  result: {
    id: 'https://127.0.0.1:8089/servicesNS/nobody/SplunkEnterpriseSecuritySuite/data/ui/views/access_analyzer',
    label: 'Access Analyzer',
    title: 'access_analyzer',
    description: 'Description of Access Analyzer',
    'eai:data':
      '<view template="SplunkEnterpriseSecuritySuite:/templates/udf_generic.html" type="html">\n  <label>Access Analyzer</label>\n  <description>Description of Access Analyzer</description>\n</view>',
    'eai:acl.app': 'SplunkEnterpriseSecuritySuite',
    'eai:acl.sharing': 'global',
    'eai:acl.owner': 'nobody',
    updated: '2025-07-23T14:33:10+00:00',
  },
};
