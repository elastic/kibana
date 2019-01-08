/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Features } from './features';

const features = new Features();

type FeatureId = keyof Features;

const build = (callback: (featureId: FeatureId) => boolean) => {
  return Object.entries(features).reduce(
    (acc, [featureId, feature]) => ({
      ...acc,
      [feature.navLinkId]: callback(featureId as FeatureId),
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
