/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getRemoteClusterName, getRemoteMonitorInfo } from './remote_result_utils';

describe('remote_result_utils', () => {
  describe('getRemoteClusterName', () => {
    it('returns the cluster name for a CCS index', () => {
      expect(getRemoteClusterName('cluster1:synthetics-browser-default')).toBe('cluster1');
    });

    it('returns undefined for a local index', () => {
      expect(getRemoteClusterName('synthetics-browser-default')).toBeUndefined();
    });

    it('handles cluster names with hyphens', () => {
      expect(getRemoteClusterName('my-remote-cluster:synthetics-http-default')).toBe(
        'my-remote-cluster'
      );
    });

    it('returns undefined for an empty string', () => {
      expect(getRemoteClusterName('')).toBeUndefined();
    });
  });

  describe('getRemoteMonitorInfo', () => {
    it('returns remote info for a known remote cluster', () => {
      expect(getRemoteMonitorInfo('cluster1:synthetics-browser-default')).toEqual({
        remoteName: 'cluster1',
      });
    });

    it('returns undefined for a local index', () => {
      expect(getRemoteMonitorInfo('synthetics-browser-default')).toBeUndefined();
    });

    it('returns remote info for a cluster with hyphens', () => {
      expect(getRemoteMonitorInfo('my-remote-cluster:synthetics-http-default')).toEqual({
        remoteName: 'my-remote-cluster',
      });
    });
  });
});
