/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const HOSTS_VIEW_PATH = 'metrics/hosts';
export const INVENTORY_PATH = 'metrics/inventory';
export const METRICS_EXPLORER_PATH = 'metrics/explorer';
export const NODE_DETAILS_PATH = 'detail/host';

export const DATES = {
  metricsAndLogs: {
    hosts: {
      withData: '10/17/2018 7:58:03 PM',
      withoutData: '10/09/2018 10:00:00 PM',
      min: '2018-10-17T19:42:21.208Z',
      max: '2018-10-17T19:58:03.952Z',
      kubernetesSectionStartDate: '2023-09-19T07:20:00.000Z',
      kubernetesSectionEndDate: '2023-09-19T07:21:00.000Z',
    },
    pods: {
      withData: '01/20/2022 5:10:00 PM',
    },
  },
};

export const DATE_PICKER_FORMAT = 'MMM D, YYYY @ HH:mm:ss.SSS';

// synthtrace date constants
export const DATE_WITH_HOSTS_DATA_FROM = '2023-03-28T18:20:00.000Z';
export const DATE_WITH_HOSTS_DATA_TO = '2023-03-28T18:21:00.000Z';
export const DATE_WITH_HOSTS_DATA = '03/28/2023 6:20:59 PM';

export const DATE_WITH_POD_DATA_FROM = '2023-09-19T07:20:00.000Z';
export const DATE_WITH_POD_DATA_TO = '2023-09-19T07:21:00.000Z';
export const DATE_WITH_POD_DATA = '09/19/2023 7:20:59 AM';
