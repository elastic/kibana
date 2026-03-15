/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { CasesServerStart } from '@kbn/cases-plugin/server';
import { AttachmentType } from '@kbn/cases-plugin/common';

interface GetAlertIdsFromCaseParams {
  caseId: string;
  cases: CasesServerStart;
  logger: Logger;
  request: KibanaRequest;
}

/**
 * Fetches all alert IDs attached to a case by using the Cases client.
 * Returns an array of alert IDs that can be used to build an alert filter
 * for Attack Discovery generation scoped to a specific case.
 *
 * @throws if the case is not found, the user lacks access, or no alerts are attached
 */
export const getAlertIdsFromCase = async ({
  caseId,
  cases,
  logger,
  request,
}: GetAlertIdsFromCaseParams): Promise<string[]> => {
  const casesClient = await cases.getCasesClientWithRequest(request);

  const documents = await casesClient.attachments.getAllDocumentsAttachedToCase({
    caseId,
    attachmentTypes: [AttachmentType.alert],
  });

  const alertIds = documents.map((doc) => doc.id);

  if (alertIds.length === 0) {
    throw new Error(`No alerts are attached to case ${caseId}`);
  }

  logger.debug(
    () => `Fetched ${alertIds.length} alert IDs from case ${caseId} for case-scoped AD generation`
  );

  return alertIds;
};
