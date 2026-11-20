/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID } from '@kbn/alertzero-common';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import {
  THREAT_INTEL_ATTRIBUTE_ALERTS_WORKFLOW_ID,
  THREAT_INTEL_ENRICH_REPORT_WORKFLOW_ID,
  THREAT_INTEL_INGEST_FEEDS_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import type { PluginScopedManagedWorkflowsApi } from '@kbn/workflows/server/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { WatchWorkflowsManagementClient } from '../watches/watch_workflows_management_client';

export const SPACE_A = 'space-a';
export const SPACE_B = 'space-b';

const CTH = SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID;

/**
 * Ingest and enrich live in the default space (deployment-wide), not the global workflow
 * space. Attribute and Continuous Threat Hunt stay per Hunt space.
 */
const DOCUMENTS = {
  ingest: { spaceId: DEFAULT_SPACE_ID, workflowId: THREAT_INTEL_INGEST_FEEDS_WORKFLOW_ID },
  enrich: { spaceId: DEFAULT_SPACE_ID, workflowId: THREAT_INTEL_ENRICH_REPORT_WORKFLOW_ID },
  attrA: {
    spaceId: SPACE_A,
    workflowId: `${THREAT_INTEL_ATTRIBUTE_ALERTS_WORKFLOW_ID}-${SPACE_A}`,
  },
  attrB: {
    spaceId: SPACE_B,
    workflowId: `${THREAT_INTEL_ATTRIBUTE_ALERTS_WORKFLOW_ID}-${SPACE_B}`,
  },
  cthA: { spaceId: SPACE_A, workflowId: `${CTH}-${SPACE_A}` },
  cthB: { spaceId: SPACE_B, workflowId: `${CTH}-${SPACE_B}` },
  cthDefault: { spaceId: DEFAULT_SPACE_ID, workflowId: `${CTH}-${DEFAULT_SPACE_ID}` },
} as const;

export type SupplyDocumentLabel = keyof typeof DOCUMENTS;

/** `true` / `false` is the `enabled` flag; an absent label is a document that is not installed. */
export type SupplyDocumentStates = Partial<Record<SupplyDocumentLabel, boolean>>;

const keyOf = (spaceId: string, workflowId: string): string => `${spaceId}/${workflowId}`;

const LABEL_BY_KEY = new Map<string, SupplyDocumentLabel>(
  (Object.keys(DOCUMENTS) as SupplyDocumentLabel[]).map((label) => [
    keyOf(DOCUMENTS[label].spaceId, DOCUMENTS[label].workflowId),
    label,
  ])
);

/**
 * In-memory workflow store keyed by `${spaceId}/${workflowId}`, shared by the management client
 * fake and the Continuous Threat Hunt status fake. A lookup with the wrong space id finds
 * nothing, and an update to an absent key throws, so a service that targets the wrong space fails.
 */
export const createKeyedSupplyStore = ({
  seed,
  failUpdates = [],
  afterUpdate,
  getHuntEnabled,
}: {
  seed: SupplyDocumentStates;
  /** Updates to these documents throw. */
  failUpdates?: SupplyDocumentLabel[];
  /** Runs after each successful update, to model a concurrent request. */
  afterUpdate?: (change: {
    label: SupplyDocumentLabel | undefined;
    enabled: boolean;
    store: Map<string, { enabled: boolean }>;
  }) => void;
  /** Overrides where Continuous Threat Hunt state is read from (default: this store). */
  getHuntEnabled?: (spaceId: string) => boolean;
}) => {
  const docs = new Map<string, { enabled: boolean }>();
  (Object.keys(seed) as SupplyDocumentLabel[]).forEach((label) => {
    const state = seed[label];
    if (state === undefined) return;
    docs.set(keyOf(DOCUMENTS[label].spaceId, DOCUMENTS[label].workflowId), { enabled: state });
  });
  const failingKeys = new Set(
    failUpdates.map((label) => keyOf(DOCUMENTS[label].spaceId, DOCUMENTS[label].workflowId))
  );
  const forbid = (label: SupplyDocumentLabel) => {
    failingKeys.add(keyOf(DOCUMENTS[label].spaceId, DOCUMENTS[label].workflowId));
  };

  const getWorkflow = jest.fn(async (workflowId: string, spaceId: string) => {
    const doc = docs.get(keyOf(spaceId, workflowId));
    return doc ? { enabled: doc.enabled } : null;
  });

  const updateWorkflow = jest.fn(
    async (workflowId: string, { enabled }: { enabled: boolean }, spaceId: string) => {
      const key = keyOf(spaceId, workflowId);
      const doc = docs.get(key);
      if (!doc) {
        throw new Error(`no workflow ${workflowId} in space ${spaceId}`);
      }
      if (failingKeys.has(key)) {
        throw new Error(`update of ${workflowId} in space ${spaceId} is forbidden`);
      }
      doc.enabled = enabled;
      afterUpdate?.({ label: LABEL_BY_KEY.get(key), enabled, store: docs });
      return {};
    }
  );

  const getWorkflowStatus = jest.fn(
    async (id: string, options: { spaceId: string; workflowIdSuffix?: string }) => {
      if (id !== CTH) {
        return { installed: false, enabled: false };
      }
      // The namespace and the id suffix stay separate so a lookup in the wrong space
      // finds nothing even when the suffix names the right space.
      const { spaceId, workflowIdSuffix = spaceId } = options;
      const doc = docs.get(keyOf(spaceId, `${CTH}-${workflowIdSuffix}`));
      return {
        installed: getHuntEnabled ? true : doc != null,
        enabled: getHuntEnabled ? getHuntEnabled(spaceId) : doc?.enabled ?? false,
      };
    }
  );

  /** Stands in for the security_solution installer: adds missing TI documents, switched off. */
  const installer = jest.fn(async ({ spaceId }: { spaceId: string }) => {
    [
      keyOf(DEFAULT_SPACE_ID, THREAT_INTEL_INGEST_FEEDS_WORKFLOW_ID),
      keyOf(DEFAULT_SPACE_ID, THREAT_INTEL_ENRICH_REPORT_WORKFLOW_ID),
      keyOf(spaceId, `${THREAT_INTEL_ATTRIBUTE_ALERTS_WORKFLOW_ID}-${spaceId}`),
    ].forEach((key) => {
      if (!docs.has(key)) {
        docs.set(key, { enabled: false });
      }
    });
  });

  const snapshot = (): SupplyDocumentStates => {
    const states: SupplyDocumentStates = {};
    docs.forEach((doc, key) => {
      const label = LABEL_BY_KEY.get(key);
      if (label) {
        states[label] = doc.enabled;
      }
    });
    return states;
  };

  return {
    forbid,
    snapshot,
    installer,
    management: { getWorkflow, updateWorkflow } as unknown as WatchWorkflowsManagementClient,
    managedWorkflows: { getWorkflowStatus } as unknown as PluginScopedManagedWorkflowsApi,
  };
};

/** An ES client for which the Hunt hard gate passes, or reports the reports index as missing. */
export const createHardGateEsClient = (reportsIndexExists: boolean): ElasticsearchClient =>
  ({
    indices: {
      exists: jest.fn(async () => reportsIndexExists),
      // Hard gate reads properties via getMapping (getFieldMapping is 410 on serverless).
      getMapping: jest.fn(async () => ({
        '.kibana-threat-reports': {
          mappings: {
            dynamic: 'strict',
            properties: {
              content: {
                properties: {
                  title: { type: 'semantic_text', inference_id: '.elser' },
                  body_text: { type: 'semantic_text', inference_id: '.elser' },
                },
              },
            },
          },
        },
      })),
    },
    inference: { get: jest.fn(async () => ({})) },
  } as unknown as ElasticsearchClient);
