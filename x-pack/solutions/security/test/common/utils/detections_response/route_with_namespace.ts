/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Generates a route string with an optional namespace.
 * @param route the route string
 * @param namespace [optional] the namespace to account for in the route
 */
export const routeWithNamespace = (route: string, namespace?: string) =>
  namespace ? `/s/${namespace}${route}` : route;
