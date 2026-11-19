/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/scout-security';

/**
 * Fleet data stream namespaces reject these characters. Hyphen is included, so a
 * Scout space id such as `test-space-2` cannot be used as `namespace`.
 */
const INVALID_FLEET_NAMESPACE_CHARACTERS = /[\\/*?"<>|\s,#:-]/;
const FLEET_DATA_STREAM_NAMESPACE = 'default';

/**
 * Fleet policies are visible only in the space that created them. Scope Kibana
 * requests at the worker space so the UI running in that space can see the host.
 *
 * The endpoint data loader copies the active space id into the agent policy
 * `namespace`. That field is a data stream namespace, not a Kibana space id,
 * so rewrite invalid values to `default`.
 */
export const scopeKbnClientToSpace = (kbnClient: KbnClient, spaceId: string): KbnClient => {
  const prefix = `/s/${spaceId}`;

  return new Proxy(kbnClient, {
    get(target, property, receiver) {
      if (property === 'request') {
        return (options: Parameters<KbnClient['request']>[0]) => {
          const path = options.path.startsWith('/') ? options.path : `/${options.path}`;
          const scopedPath = path.startsWith(`${prefix}/`) ? path : `${prefix}${path}`;
          return target.request({
            ...withValidFleetNamespace(options),
            path: scopedPath,
          });
        };
      }

      const value: unknown = Reflect.get(target, property, receiver);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  }) as KbnClient;
};

const withValidFleetNamespace = (
  options: Parameters<KbnClient['request']>[0]
): Parameters<KbnClient['request']>[0] => {
  const { body } = options;
  if (!body || typeof body !== 'object' || Array.isArray(body) || !('namespace' in body)) {
    return options;
  }

  const namespace = body.namespace;
  if (typeof namespace !== 'string' || !INVALID_FLEET_NAMESPACE_CHARACTERS.test(namespace)) {
    return options;
  }

  return {
    ...options,
    body: {
      ...body,
      namespace: FLEET_DATA_STREAM_NAMESPACE,
    },
  };
};
