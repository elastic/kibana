/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';

/** Maximum alerts per bulk attachment request (Cases API limit) */
const ALERT_ATTACHMENT_BATCH_SIZE = 100;

/**
 * Minimal cases client interface required by case operations.
 * This avoids a direct dependency on the full CasesClient type.
 */
export interface CasesClientLike {
  cases: {
    create: (params: Record<string, unknown>) => Promise<{ id: string; title: string }>;
    find: (params: Record<string, unknown>) => Promise<{
      cases: Array<{
        id: string;
        title: string;
        status: string;
        observables?: Array<{ typeKey: string; value: string }>;
        created_at: string;
        updated_at: string;
      }>;
    }>;
    get: (params: { id: string }) => Promise<Record<string, unknown>>;
    update: (params: Record<string, unknown>) => Promise<unknown>;
    addObservable: (caseId: string, params: Record<string, unknown>) => Promise<unknown>;
  };
  attachments: {
    bulkCreate: (params: Record<string, unknown>) => Promise<unknown>;
    bulkDelete: (params: Record<string, unknown>) => Promise<unknown>;
    getAll: (params: { caseID: string }) => Promise<Array<Record<string, unknown>>>;
    add: (params: Record<string, unknown>) => Promise<unknown>;
  };
}

/**
 * Creates a new case with auto-extract observables enabled.
 */
export const createCase = async (
  casesClient: CasesClientLike,
  params: {
    title: string;
    description?: string;
    severity?: string;
    tags?: string[];
  }
): Promise<{ id: string; title: string }> => {
  const newCase = await casesClient.cases.create({
    title: params.title,
    description: params.description ?? 'Auto-grouped alerts',
    tags: params.tags ?? ['alert-grouping', 'auto-created'],
    severity: (params.severity as 'low' | 'medium' | 'high' | 'critical') ?? 'medium',
    owner: 'securitySolution',
    connector: { id: 'none', name: 'none', type: '.none', fields: null },
    settings: { syncAlerts: true, extractObservables: true },
  });

  return { id: newCase.id, title: newCase.title };
};

/**
 * Attaches alerts to a case in batches to respect the Cases API limit.
 */
export const attachAlertsToCase = async (
  casesClient: CasesClientLike,
  caseId: string,
  alerts: Array<{ id: string; index: string }>
): Promise<void> => {
  for (let i = 0; i < alerts.length; i += ALERT_ATTACHMENT_BATCH_SIZE) {
    const batch = alerts.slice(i, i + ALERT_ATTACHMENT_BATCH_SIZE);
    await casesClient.attachments.bulkCreate({
      caseId,
      attachments: batch.map((alert) => ({
        type: 'alert' as const,
        alertId: alert.id,
        index: alert.index,
        rule: { id: null, name: null },
        owner: 'securitySolution',
      })),
    });
  }
};

/**
 * Fetches open security cases and maps them to CaseData format.
 */
export const fetchOpenSecurityCases = async (
  casesClient: CasesClientLike,
  logger: Logger
): Promise<
  Array<{
    id: string;
    title: string;
    status: string;
    observables: Array<{ typeKey: string; value: string }>;
    alertIds: string[];
    createdAt: string;
    updatedAt: string;
  }>
> => {
  try {
    const result = await casesClient.cases.find({
      perPage: 100,
      status: 'open',
      owner: ['securitySolution'],
    });
    return result.cases.map((c) => ({
      id: c.id,
      title: c.title,
      status: c.status,
      observables: (c.observables ?? []).map((o) => ({
        typeKey: o.typeKey,
        value: o.value,
      })),
      alertIds: [],
      createdAt: c.created_at,
      updatedAt: c.updated_at,
    }));
  } catch (err) {
    logger.error(`Failed to get cases: ${err}`);
    return [];
  }
};

/**
 * Detaches specific alerts from a case by finding and deleting their attachment records.
 */
export const detachAlertsFromCase = async (
  casesClient: CasesClientLike,
  logger: Logger,
  caseId: string,
  alertIds: string[]
): Promise<void> => {
  const attachments = await casesClient.attachments.getAll({ caseID: caseId });

  const alertAttachmentIds: string[] = [];
  for (const attachment of attachments) {
    if (
      attachment.type === 'alert' &&
      'alertId' in attachment &&
      alertIds.includes(attachment.alertId as string)
    ) {
      alertAttachmentIds.push(attachment.id as string);
    }
  }

  if (alertAttachmentIds.length > 0) {
    await casesClient.attachments.bulkDelete({
      caseID: caseId,
      attachmentIDs: alertAttachmentIds,
    });
    logger.info(`Detached ${alertAttachmentIds.length} alerts from case ${caseId}`);
  }
};

/**
 * Adds a user comment to a case.
 */
export const addCommentToCase = async (
  casesClient: CasesClientLike,
  caseId: string,
  comment: string
): Promise<void> => {
  await casesClient.attachments.add({
    caseId,
    comment: {
      type: 'user' as const,
      comment,
      owner: 'securitySolution',
    },
  });
};
