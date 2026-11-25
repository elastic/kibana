/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kibanaService } from '../../../../utils/kibana_service';
import {
  getLoadedFromRemoteOriginTooltip,
  getRemoteBadgeLabel,
  getRemoteMonitorCalloutTitle,
  getRemoteOriginFieldLabel,
  getRemoteUrlUnavailableTooltip,
  getViewOnRemoteOriginButtonLabel,
  isLinkedProjectOrigin,
} from './remote_origin_copy';

describe('remote_origin_copy', () => {
  afterEach(() => {
    kibanaService.isServerless = false;
  });

  it('uses CCS cluster copy on stateful', () => {
    kibanaService.isServerless = false;

    expect(isLinkedProjectOrigin()).toBe(false);
    expect(getRemoteMonitorCalloutTitle()).toBe('Remote monitor');
    expect(getViewOnRemoteOriginButtonLabel()).toBe('View on remote cluster');
    expect(getRemoteBadgeLabel()).toBe('Remote');
    expect(getRemoteOriginFieldLabel()).toBe('Remote cluster');
    expect(getLoadedFromRemoteOriginTooltip('cluster-west')).toBe(
      'Loaded from remote cluster cluster-west'
    );
    expect(getRemoteUrlUnavailableTooltip()).toContain('remote cluster');
  });

  it('uses linked-project copy on serverless', () => {
    kibanaService.isServerless = true;

    expect(isLinkedProjectOrigin()).toBe(true);
    expect(getRemoteMonitorCalloutTitle()).toBe('Linked project monitor');
    expect(getViewOnRemoteOriginButtonLabel()).toBe('View on linked project');
    expect(getRemoteBadgeLabel()).toBe('Linked');
    expect(getRemoteOriginFieldLabel()).toBe('Linked project');
    expect(getLoadedFromRemoteOriginTooltip('keep-serverless-qa-oblt-dc9711')).toBe(
      'Loaded from linked project keep-serverless-qa-oblt-dc9711'
    );
    expect(getRemoteUrlUnavailableTooltip()).toContain('linked project');
  });
});
