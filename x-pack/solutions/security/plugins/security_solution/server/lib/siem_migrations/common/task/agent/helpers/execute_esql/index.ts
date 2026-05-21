/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TranslatePanelGraphParams } from '../../../../../dashboards/task/agent/sub_graphs/translate_panel/types';

export const executeEsqlQuery = async (
  query: string,
  params: TranslatePanelGraphParams
): Promise<string | undefined> => {
  try {
    await params.esScopedClient.asCurrentUser.esql.query({
      query,
      format: 'json',
    });
    return undefined;
  } catch (error) {
    const reason =
      error?.meta?.body?.error?.caused_by?.reason ??
      error?.meta?.body?.error?.reason ??
      error?.message ??
      'Unknown execution error';
    params.logger.debug(`ES|QL execution error: ${reason}`);
    return `ES|QL execution error: ${reason}`;
  }
};
