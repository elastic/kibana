/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Unit tests for `getNodeInfo`, the builder of the `info` object returned by
 * `POST /api/infra/metadata`.
 *
 * These exercise the production `getNodeInfo` directly with a mocked framework
 * so that dropping the `schema` argument on either the pod -> host recursion or
 * the `findInventoryFields` lookup (which would make the OpenTelemetry/semconv
 * host detail panel render empty) fails these tests.
 */

import { getNodeInfo } from './get_node_info';
import type { KibanaFramework } from '../../../lib/adapters/framework/kibana_framework_adapter';
import type { InfraPluginRequestHandlerContext } from '../../../types';
import type { InfraSourceConfiguration } from '../../../lib/sources';

const createFramework = (...responses: unknown[]) => {
  const callWithRequest = jest.fn();
  if (responses.length === 0) {
    callWithRequest.mockResolvedValue({ hits: { hits: [] } });
  } else {
    responses.forEach((response) => callWithRequest.mockResolvedValueOnce(response));
  }
  return { framework: { callWithRequest } as unknown as KibanaFramework, callWithRequest };
};

const requestContext = {} as InfraPluginRequestHandlerContext;
const sourceConfiguration = { metricAlias: 'metrics-*' } as InfraSourceConfiguration;
const timeRange = { from: 0, to: 1 };

/** Pull the `match` filter clause (the id-field filter) out of a search call. */
const idMatchClause = (params: any) =>
  params.body.query.bool.filter.find((clause: any) => 'match' in clause)?.match;

describe('getNodeInfo', () => {
  describe('host lookup', () => {
    it('matches on the ECS id field when the schema is ecs', async () => {
      const { framework, callWithRequest } = createFramework();

      await getNodeInfo(
        framework,
        requestContext,
        sourceConfiguration,
        'host-1',
        'host',
        timeRange,
        'ecs'
      );

      expect(idMatchClause(callWithRequest.mock.calls[0][2])).toEqual({ 'host.name': 'host-1' });
    });

    it('matches on the semconv id field when the schema is semconv', async () => {
      const { framework, callWithRequest } = createFramework();

      await getNodeInfo(
        framework,
        requestContext,
        sourceConfiguration,
        'host-1',
        'host',
        timeRange,
        'semconv'
      );

      // `host` has no semconv override, so the id field stays `host.name`, but
      // the call must still resolve it via the schema-aware lookup.
      expect(idMatchClause(callWithRequest.mock.calls[0][2])).toEqual({ 'host.name': 'host-1' });
    });
  });

  describe('pod lookup', () => {
    it('uses the semconv pod id field so the pod node-name lookup is not empty', async () => {
      // First call: getPodNodeName resolves the backing host name.
      // Second call: the recursive host getNodeInfo.
      const { framework, callWithRequest } = createFramework(
        { hits: { hits: [{ fields: { 'k8s.node.name': ['node-a'] } }] } },
        { hits: { hits: [] } }
      );

      await getNodeInfo(
        framework,
        requestContext,
        sourceConfiguration,
        'pod-1',
        'pod',
        timeRange,
        'semconv'
      );

      // Bug 2: findInventoryFields must receive the schema so the pod id field
      // resolves to the semconv `k8s.pod.uid`, not the ECS `kubernetes.pod.uid`.
      expect(idMatchClause(callWithRequest.mock.calls[0][2])).toEqual({ 'k8s.pod.uid': 'pod-1' });
    });

    it('threads the schema into the recursive host lookup', async () => {
      const { framework, callWithRequest } = createFramework(
        { hits: { hits: [{ fields: { 'k8s.node.name': ['node-a'] } }] } },
        { hits: { hits: [] } }
      );

      await getNodeInfo(
        framework,
        requestContext,
        sourceConfiguration,
        'pod-1',
        'pod',
        timeRange,
        'semconv'
      );

      // Bug 1: the recursive host lookup must run (two searches), proving the
      // pod node name was found with the semconv schema and the recursion fired.
      expect(callWithRequest).toHaveBeenCalledTimes(2);
      expect(idMatchClause(callWithRequest.mock.calls[1][2])).toEqual({ 'host.name': 'node-a' });
    });
  });
});
