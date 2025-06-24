/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, type TypeOf } from '@kbn/config-schema';
import { ProductLine, ProductTier } from './product';

export const productLine = schema.oneOf([
  schema.literal(ProductLine.security),
  schema.literal(ProductLine.endpoint),
  schema.literal(ProductLine.cloud),
  schema.literal(ProductLine.aiSoc),
]);

export type SecurityProductLine = TypeOf<typeof productLine>;

export const productTier = schema.oneOf([
  schema.literal(ProductTier.searchAiLake),
  schema.literal(ProductTier.essentials),
  schema.literal(ProductTier.complete),
]);
export type SecurityProductTier = TypeOf<typeof productTier>;

export const productType = schema.object({
  product_line: productLine,
  product_tier: productTier,
});
export type SecurityProductType = TypeOf<typeof productType>;

export const productTypes = schema.arrayOf<SecurityProductType>(productType, {
  defaultValue: [],
});
export type SecurityProductTypes = TypeOf<typeof productTypes>;

const commonConfigSchemaProps = {
  productTypes,
  /**
   * For internal use. A list of string values (comma delimited) that will enable experimental
   * type of functionality that is not yet released. Valid values for this settings need to
   * be defined in:
   * `x-pack/solutions/security/plugins/security_solution_serverless/common/experimental_features.ts`
   * under the `allowedExperimentalValues` object
   *
   * @example
   * xpack.securitySolutionServerless.enableExperimental:
   *   - someCrazyFeature
   *   - someEvenCrazierFeature
   */
  enableExperimental: schema.arrayOf(schema.string(), {
    defaultValue: () => [],
  }),
  /**
   * A list of APP IDs that are not accessible in the serverless environment.
   * This is used to disable the apps in the UI and prevent users from accessing them.
   */
  inaccessibleApps: schema.arrayOf(schema.string(), { defaultValue: [] }),
};

export const commonConfigSchema = schema.object(commonConfigSchemaProps);

export type ServerlessSecurityPublicConfig = TypeOf<typeof commonConfigSchema>;

// This is used to expose the common config schema properties to the browser
// so that they can be used in the client-side code.
export const exposeToBrowser = Object.fromEntries(
  Object.keys(commonConfigSchemaProps).map((prop) => [prop, true])
);
