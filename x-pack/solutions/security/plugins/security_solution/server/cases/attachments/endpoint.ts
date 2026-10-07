/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SECURITY_ENDPOINT_ATTACHMENT_TYPE } from '@kbn/cases-plugin/common';

import { EndpointAttachmentPayloadSchema } from '../../../common/cases/attachments/endpoint';

/**
 * Server-side `security.endpoint` unified attachment registration.
 * The full-payload zod schema is owned by `common/cases/attachments/endpoint.ts`
 * so server validation and client-side renderer types stay in lock step.
 */
export const getEndpointAttachmentType = () => ({
  id: SECURITY_ENDPOINT_ATTACHMENT_TYPE,
  schema: EndpointAttachmentPayloadSchema,
});
