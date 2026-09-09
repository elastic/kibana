/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  THREAT_INTEL_ATTRIBUTE_ALERTS_WORKFLOW_ID,
  THREAT_INTEL_ENRICH_REPORT_WORKFLOW_ID,
  THREAT_INTEL_INGEST_FEEDS_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import { GLOBAL_WORKFLOW_SPACE_ID } from '@kbn/workflows/server';
import {
  installThreatIntelManagedWorkflows,
  reconcileThreatIntelAttributeWorkflows,
  uninstallThreatIntelManagedWorkflows,
} from './install';

const createClient = () => ({
  install: jest.fn().mockResolvedValue(undefined),
  uninstall: jest.fn().mockResolvedValue(undefined),
  ready: jest.fn().mockResolvedValue(undefined),
});

describe('threat intel managed workflow install', () => {
  it('installs ingest and enrich once globally and attribute per space', async () => {
    const client = createClient();

    await installThreatIntelManagedWorkflows({
      managedWorkflowsClient: client as never,
      spaceIds: ['default', 'space-a'],
    });

    expect(client.install).toHaveBeenCalledWith(THREAT_INTEL_INGEST_FEEDS_WORKFLOW_ID, {
      spaceId: GLOBAL_WORKFLOW_SPACE_ID,
    });
    expect(client.install).toHaveBeenCalledWith(THREAT_INTEL_ENRICH_REPORT_WORKFLOW_ID, {
      spaceId: GLOBAL_WORKFLOW_SPACE_ID,
    });
    expect(client.install).toHaveBeenCalledWith(THREAT_INTEL_ATTRIBUTE_ALERTS_WORKFLOW_ID, {
      spaceId: 'default',
      workflowIdSuffix: 'default',
    });
    expect(client.install).toHaveBeenCalledWith(THREAT_INTEL_ATTRIBUTE_ALERTS_WORKFLOW_ID, {
      spaceId: 'space-a',
      workflowIdSuffix: 'space-a',
    });
    expect(client.install).toHaveBeenCalledTimes(4);
  });

  it('reconciles attribute installs for the given spaces only', async () => {
    const client = createClient();

    await reconcileThreatIntelAttributeWorkflows({
      managedWorkflowsClient: client as never,
      spaceIds: ['space-b'],
    });

    expect(client.install).toHaveBeenCalledTimes(1);
    expect(client.install).toHaveBeenCalledWith(THREAT_INTEL_ATTRIBUTE_ALERTS_WORKFLOW_ID, {
      spaceId: 'space-b',
      workflowIdSuffix: 'space-b',
    });
  });

  it('uninstalls the two global workflows and attribute per space', async () => {
    const client = createClient();

    await uninstallThreatIntelManagedWorkflows({
      managedWorkflowsClient: client as never,
      spaceIds: ['default', 'space-a'],
    });

    expect(client.uninstall).toHaveBeenCalledWith(THREAT_INTEL_INGEST_FEEDS_WORKFLOW_ID, {
      spaceId: GLOBAL_WORKFLOW_SPACE_ID,
    });
    expect(client.uninstall).toHaveBeenCalledWith(THREAT_INTEL_ENRICH_REPORT_WORKFLOW_ID, {
      spaceId: GLOBAL_WORKFLOW_SPACE_ID,
    });
    expect(client.uninstall).toHaveBeenCalledWith(THREAT_INTEL_ATTRIBUTE_ALERTS_WORKFLOW_ID, {
      spaceId: 'default',
      workflowIdSuffix: 'default',
    });
    expect(client.uninstall).toHaveBeenCalledWith(THREAT_INTEL_ATTRIBUTE_ALERTS_WORKFLOW_ID, {
      spaceId: 'space-a',
      workflowIdSuffix: 'space-a',
    });
  });

  it('tolerates uninstall failures so a partial prior install still cleans up', async () => {
    const client = createClient();
    client.uninstall.mockRejectedValueOnce(new Error('missing')).mockResolvedValue(undefined);

    await expect(
      uninstallThreatIntelManagedWorkflows({
        managedWorkflowsClient: client as never,
        spaceIds: ['default'],
      })
    ).resolves.toBeUndefined();
    expect(client.uninstall).toHaveBeenCalledTimes(3);
  });
});
