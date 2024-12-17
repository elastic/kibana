/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validate } from '@kbn/securitysolution-io-ts-utils';
import { IKibanaResponse, KibanaRequest, KibanaResponseFactory } from '@kbn/core-http-server';

import { CreateExceptionListRequestDecoded, createExceptionListResponse } from '../../common/api';
import { SiemResponseFactory, getExceptionListClient } from '../routes';
import { ListsRequestHandlerContext } from '../types';

export const createExceptionListHandler = async (
  context: ListsRequestHandlerContext,
  request: KibanaRequest<unknown, unknown, CreateExceptionListRequestDecoded, 'post'>,
  response: KibanaResponseFactory,
  siemResponse: SiemResponseFactory,
  options: { ignoreExisting: boolean } = { ignoreExisting: false }
): Promise<IKibanaResponse> => {
  const {
    name,
    tags,
    meta,
    namespace_type: namespaceType,
    description,
    list_id: listId,
    type,
    version,
  } = request.body;
  const exceptionLists = await getExceptionListClient(context);
  const exceptionList = await exceptionLists.getExceptionList({
    id: undefined,
    listId,
    namespaceType,
  });

  if (exceptionList != null) {
    if (options.ignoreExisting) {
      return response.ok({ body: exceptionList });
    }
    return siemResponse.error({
      body: `exception list id: "${listId}" already exists`,
      statusCode: 409,
    });
  } else {
    const createdList = await exceptionLists.createExceptionList({
      description,
      immutable: false,
      listId,
      meta,
      name,
      namespaceType,
      tags,
      type,
      version,
    });
    const [validated, errors] = validate(createdList, createExceptionListResponse);
    if (errors != null) {
      return siemResponse.error({ body: errors, statusCode: 500 });
    } else {
      return response.ok({ body: validated ?? {} });
    }
  }
};
