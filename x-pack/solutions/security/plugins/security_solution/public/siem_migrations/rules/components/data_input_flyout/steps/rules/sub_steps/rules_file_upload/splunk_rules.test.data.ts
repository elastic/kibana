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
      id: 'some_id1',
      title: 'Alert with IP Method and URI Filters with Default Severity',
      search:
        'source="testing_data.zip:*" clientip="198.35.1.75" method=POST uri_path="/cart/error.do"',
      description: '',
      'alert.severity': '3',
    },
  },
  {
    preview: false,
    result: {
      id: 'some_id2',
      title: 'New Alert with Index filter',
      search: 'source="testing_data.zip:*"  | search server="MacBookPro.fritz.box" index=main',
      description: 'Tutorial data based on host name',
      'alert.severity': '5',
    },
  },
  {
    preview: false,
    result: {
      id: 'some_id3',
      title: 'Sample Alert in Essentials',
      search: 'source="testing_file.zip:*"',
      description: '',
      'alert.severity': '3',
    },
  },
  {
    preview: false,
    lastrow: true,
    result: {
      id: 'some_id4',
      title: 'Tutorial data based on host name',
      search: 'source="testing_file.zip:*" \n| search host=vendor_sales',
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
