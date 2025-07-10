/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import { HttpError } from '../types/api';
import { ErrorCode } from '../types/error_codes';

export const errorToText = (error?: HttpError): string | undefined => {
  if (!error) {
    return undefined;
  }
  if (error.body?.attributes?.error_code === ErrorCode.INDEX_ALREADY_EXISTS) {
    return i18n.translate(
      'xpack.enterpriseSearch.content.newIndex.steps.buildConnector.error.indexAlreadyExists',
      {
        defaultMessage: 'This index already exists',
      }
    );
  }
  if (error.body?.attributes?.error_code === ErrorCode.CONNECTOR_DOCUMENT_ALREADY_EXISTS) {
    return i18n.translate(
      'xpack.enterpriseSearch.content.newIndex.steps.buildConnector.error.connectorAlreadyExists',
      {
        defaultMessage: 'A connector for this index already exists',
      }
    );
  }
  if (error.body?.attributes?.error_code === ErrorCode.CRAWLER_ALREADY_EXISTS) {
    return i18n.translate(
      'xpack.enterpriseSearch.content.newIndex.steps.buildConnector.error.connectorAlreadyExists',
      {
        defaultMessage: 'A connector for this index already exists',
      }
    );
  }
  if (error?.body?.statusCode === 403) {
    return i18n.translate(
      'xpack.enterpriseSearch.content.newIndex.steps.buildConnector.error.unauthorizedError',
      {
        defaultMessage: 'You are not authorized to create this connector',
      }
    );
  } else
    return i18n.translate(
      'xpack.enterpriseSearch.content.newIndex.steps.buildConnector.error.genericError',
      {
        defaultMessage: 'We were not able to create your index',
      }
    );
};
