/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const policyLabels = [
  {
    name: 'synthetics',
    label: i18n.translate('xpack.synthetics.settingsRoute.allChecks', {
      defaultMessage: 'All Checks',
    }),
    indexTemplate: 'synthetics',
  },
  {
    name: 'synthetics-synthetics.browser-default_policy',
    label: i18n.translate('xpack.synthetics.settingsRoute.browserChecks', {
      defaultMessage: 'Browser Checks',
    }),
    indexTemplate: 'synthetics-browser',
  },
  {
    name: 'synthetics-synthetics.browser_network-default_policy',
    label: i18n.translate('xpack.synthetics.settingsRoute.browserNetworkRequests', {
      defaultMessage: 'Browser Network Requests',
    }),
    indexTemplate: 'synthetics-browser.network',
  },
  {
    name: 'synthetics-synthetics.browser_screenshot-default_policy',
    label: 'Browser Screenshots',
    indexTemplate: 'synthetics-browser.screenshot',
  },
  {
    name: 'synthetics-synthetics.http-default_policy',
    label: 'HTTP Pings',
    indexTemplate: 'synthetics-http',
  },
  {
    name: 'synthetics-synthetics.icmp-default_policy',
    label: 'ICMP Pings',
    indexTemplate: 'synthetics-icmp',
  },
  {
    name: 'synthetics-synthetics.tcp-default_policy',
    label: 'TCP Pings',
    indexTemplate: 'synthetics-tcp',
  },
];
