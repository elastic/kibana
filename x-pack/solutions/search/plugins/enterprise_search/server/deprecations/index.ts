/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {GetDeprecationsContext, RegisterDeprecationsConfig} from "@kbn/core-deprecations-server";
import {DeprecationsDetails} from "@kbn/core-deprecations-common";
import { getEnterpriseSearchNodeDeprecation } from './remove_enterprise_search';

export const getRegisteredDeprecations = (): RegisterDeprecationsConfig => {
  return {
    getDeprecations: async (ctx: GetDeprecationsContext) => {
      const deprecations : DeprecationsDetails[] = [];
      deprecations.push(await getEnterpriseSearchNodeDeprecation(ctx))
      return deprecations;
    }
  }
}
