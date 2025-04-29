/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ListClient } from '../../services/lists/list_client';
import { ErrorWithStatusCode } from '../../error_with_status_code';
import type { ListsRequestHandlerContext } from '../../types';

export const getListClient = async (context: ListsRequestHandlerContext): Promise<ListClient> => {
  const lists = (await context.lists)?.getListClient();
  if (lists == null) {
    throw new ErrorWithStatusCode('Lists is not found as a plugin', 404);
  } else {
    return lists;
  }
};
