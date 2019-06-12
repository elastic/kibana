/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Features } from './features';

type buildCallback = (featureId: string) => boolean;
export class NavLinksBuilder {
  private readonly features: Features;
  constructor(features: Features) {
    this.features = {
      ...features,
      // management isn't a first-class "feature", but it makes our life easier here to pretend like it is
      management: {
        navLinkId: 'kibana:management',
      },
    };
  }

  public all() {
    return this.build(() => true);
  }
  public except(...feature: string[]) {
    return this.build(featureId => !feature.includes(featureId));
  }
  public none() {
    return this.build(() => false);
  }
  public only(...feature: string[]) {
    return this.build(featureId => feature.includes(featureId));
  }

  private build(callback: buildCallback): Record<string, boolean> {
    const navLinks = {} as Record<string, boolean>;
    for (const [featureId, feature] of Object.entries(this.features)) {
      if (feature.navLinkId) {
        navLinks[feature.navLinkId] = callback(featureId);
      }
    }

    return navLinks;
  }
}
