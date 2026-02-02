/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PerformAnonymizationFieldsBulkActionRequestBody } from '@kbn/elastic-assistant-common';
import {
  API_VERSIONS,
  ELASTIC_AI_ASSISTANT_ANONYMIZATION_FIELDS_URL_BULK_ACTION,
  ELASTIC_AI_ASSISTANT_ANONYMIZATION_FIELDS_URL_FIND,
  UPDATE_ANONYMIZATION_FIELDS_URL,
} from '@kbn/elastic-assistant-common';
import type SuperTest from 'supertest';
import {
  ELASTIC_HTTP_VERSION_HEADER,
  X_ELASTIC_INTERNAL_ORIGIN_REQUEST,
} from '@kbn/core-http-common';
import { routeWithNamespace } from '@kbn/detections-response-ftr-services';

export const updateAnonymizationFields = ({
  supertest,
  space = 'default',
}: {
  supertest: SuperTest.Agent;
  space?: string;
}) => {
  return supertest
    .post(routeWithNamespace(UPDATE_ANONYMIZATION_FIELDS_URL, space))
    .set('kbn-xsrf', 'true')
    .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.internal.v1)
    .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana');
};

export const getAnonymizationFields = ({
  supertest,
  space = 'default',
}: {
  supertest: SuperTest.Agent;
  space?: string;
}) => {
  return supertest
    .get(routeWithNamespace(ELASTIC_AI_ASSISTANT_ANONYMIZATION_FIELDS_URL_FIND, space))
    .set('kbn-xsrf', 'true')
    .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.public.v1)
    .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
    .query({ per_page: 1000 });
};

export const performAnonymizationFieldsBulkActions = ({
  supertest,
  space = 'default',
  body,
}: {
  supertest: SuperTest.Agent;
  space?: string;
  body: PerformAnonymizationFieldsBulkActionRequestBody;
}) => {
  return supertest
    .post(routeWithNamespace(ELASTIC_AI_ASSISTANT_ANONYMIZATION_FIELDS_URL_BULK_ACTION, space))
    .set('kbn-xsrf', 'true')
    .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.public.v1)
    .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
    .send(body);
};
