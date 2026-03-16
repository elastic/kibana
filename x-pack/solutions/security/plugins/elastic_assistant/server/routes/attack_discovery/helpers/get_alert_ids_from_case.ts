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
