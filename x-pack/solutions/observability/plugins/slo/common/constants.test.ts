/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getSLIIndexNamePrefix,
  getSLIRoutingPipelineName,
  SLI_INGEST_PIPELINE_INDEX_NAME_PREFIX,
  SLI_ROUTED_VERSIONS,
  SLI_ROUTING_MIN_VERSION,
  SLO_RESOURCES_VERSION,
} from './constants';

describe('SLI routing constants', () => {
  it('ends SLI_ROUTED_VERSIONS with SLO_RESOURCES_VERSION', () => {
    expect(SLI_ROUTED_VERSIONS[SLI_ROUTED_VERSIONS.length - 1]).toBe(SLO_RESOURCES_VERSION);
  });

  it('only routes versions from SLI_ROUTING_MIN_VERSION, in strictly ascending order', () => {
    SLI_ROUTED_VERSIONS.forEach((version, index) => {
      expect(version).toBeGreaterThanOrEqual(SLI_ROUTING_MIN_VERSION);
      if (index > 0) {
        expect(version).toBeGreaterThan(SLI_ROUTED_VERSIONS[index - 1]);
      }
    });
  });

  it('derives the current SLI index name prefix from the resources version', () => {
    expect(getSLIIndexNamePrefix(SLO_RESOURCES_VERSION)).toBe(
      SLI_INGEST_PIPELINE_INDEX_NAME_PREFIX
    );
    expect(getSLIIndexNamePrefix(3.6)).toBe('.slo-observability.sli-v3.6.');
  });

  it('names the routing pipeline after the resources version', () => {
    expect(getSLIRoutingPipelineName(3.6)).toBe('.slo-observability.sli.routing-v3.6');
  });
});
