/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

class NavLinks {
  public apm = 'apm';
  public canvas = 'canvas';
  public graph = 'graph';
  public infrastructure = 'infra:home';
  public logs = 'infra:logs';
  public dashboard = 'kibana:dashboard';
  public devTools = 'kibana:dev_tools';
  public discover = 'kibana:discover';
  public management = 'kibana:management';
  public visualize = 'kibana:visualize';
  public ml = 'ml';
  public monitoring = 'monitoring';
  public timelion = 'timelion';
}
const navLinks = new NavLinks();

type FeatureId = keyof NavLinks;

const build = (callback: (featureId: FeatureId) => boolean) => {
  return Object.entries(navLinks).reduce(
    (acc, [featureId, navLinkId]) => ({
      ...acc,
      [navLinkId]: callback(featureId as FeatureId),
    }),
    {}
  );
};

export const navLinksBuilder = {
  all() {
    return build(() => true);
  },
  except(...feature: FeatureId[]): Record<string, boolean> {
    return build(featureId => !feature.includes(featureId as FeatureId));
  },
  none() {
    return build(() => false);
  },
  only(...feature: FeatureId[]): Record<string, boolean> {
    return build(featureId => feature.includes(featureId as FeatureId));
  },
};
