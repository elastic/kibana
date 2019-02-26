/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

interface Feature {
  navLinkId: string;
}

export class Features {
  public advancedSettings: Feature = {
    navLinkId: 'kibana:management',
  };
  public apm: Feature = {
    navLinkId: 'apm',
  };
  public canvas: Feature = {
    navLinkId: 'canvas',
  };
  public dashboard: Feature = {
    navLinkId: 'kibana:dashboard',
  };
  // tslint:disable-next-line variable-name
  public dev_tools: Feature = {
    navLinkId: 'kibana:dev_tools',
  };
  public discover: Feature = {
    navLinkId: 'kibana:discover',
  };
  public graph: Feature = {
    navLinkId: 'graph',
  };
  public maps: Feature = {
    navLinkId: 'maps',
  };
  public infrastructure: Feature = {
    navLinkId: 'infra:home',
  };
  public logs: Feature = {
    navLinkId: 'infra:logs',
  };
  public management: Feature = {
    navLinkId: 'kibana:management',
  };
  public ml: Feature = {
    navLinkId: 'ml',
  };
  public monitoring: Feature = {
    navLinkId: 'monitoring',
  };
  public timelion: Feature = {
    navLinkId: 'timelion',
  };
  public uptime: Feature = {
    navLinkId: 'uptime',
  };
  public visualize: Feature = {
    navLinkId: 'kibana:visualize',
  };
  public foo: Feature = {
    navLinkId: 'foo_plugin',
  };
}
