/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const splunkTestRules = [
  {
    preview: false,
    result: {
      id: 'https://127.0.0.1:8089/servicesNS/splunk-admin/Splunk_Security_Essentials/saved/searches/Alert%20with%20IP%20Method%20and%20URI%20Filters%20with%20Default%20Severity',
      title: 'Alert with IP Method and URI Filters with Default Severity',
      search:
        'source="tutorialdata.zip:*" clientip="198.35.1.75" method=POST uri_path="/cart/error.do"',
      description: '',
      'alert.severity': '3',
    },
  },
  {
    preview: false,
    result: {
      id: 'https://127.0.0.1:8089/servicesNS/splunk-admin/Splunk_Security_Essentials/saved/searches/New%20Alert%20with%20Index%20filter',
      title: 'New Alert with Index filter',
      search:
        'source="tutorialdata.zip:*"  | search splunk_server="MacBookPro.fritz.box" index=main',
      description: 'Tutorial data based on host name',
      'alert.severity': '5',
    },
  },
  {
    preview: false,
    result: {
      id: 'https://127.0.0.1:8089/servicesNS/nobody/Splunk_Security_Essentials/saved/searches/Sample%20Alert%20in%20Essentials',
      title: 'Sample Alert in Essentials',
      search: 'source="tutorialdata.zip:*"',
      description: '',
      'alert.severity': '3',
    },
  },
  {
    preview: false,
    lastrow: true,
    result: {
      id: 'https://127.0.0.1:8089/servicesNS/splunk-admin/Splunk_Security_Essentials/saved/searches/Tutorial%20data%20based%20on%20host%20name',
      title: 'Tutorial data based on host name',
      search: 'source="tutorialdata.zip:*" \n| search host=vendor_sales',
      description: 'Tutorial data based on host name',
      'alert.severity': '5',
    },
  },
];

export const invalidTestRulesFormat = [
  {
    result: {
      some: 'key',
    },
  },
  {
    result: {
      description: {
        some: 'key',
      },
    },
  },
];
