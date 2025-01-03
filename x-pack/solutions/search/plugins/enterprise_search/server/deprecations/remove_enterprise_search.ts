/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */


import {DeprecationsDetails} from "@kbn/core-deprecations-common";
import {GetDeprecationsContext} from "@kbn/core-deprecations-server";

export const getEnterpriseSearchNodeDeprecation = async (ctx: GetDeprecationsContext): Promise<DeprecationsDetails> => {
  /**
   * If Enterprise Search Node is configured, it's marked as a critical deprecation
   * Warns that removing the node will disable crawlers/connectors
   */
  //TODO
  return {
    level: 'critical',
    deprecationType: 'feature',
    title: 'Enterprise Search host(s) must be removed',
    message: 'Enterprise Search is not supported in versions >= 9.x',
    documentationUrl: 'https://docs.elastic.co', //TODO
    correctiveActions: {
      manualSteps: ['Remove all Enterprise Search nodes from your deployment'],
    },
  }
}
