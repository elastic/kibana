/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CasesServerSetup } from '@kbn/cases-plugin/server';
import { SECURITY_ENDPOINT_ATTACHMENT_TYPE } from '@kbn/cases-plugin/common';

import { validateEndpointAttachmentMetadata } from './endpoint_metadata_schema';
import { getEventAttachmentType } from './event';

/**
 * Legacy external-reference attachment type id used by clients that pre-date the
 * unified `security.endpoint` attachment migration. We keep it registered so
 * existing API callers that still POST
 * `{ type: 'externalReference', externalReferenceAttachmentTypeId: 'endpoint', ... }`
 * are not rejected with `400 "Attachment type endpoint is not registered."`.
 *
 * On read, the cases server converts these legacy-shape SOs to the unified
 * `security.endpoint` shape via `externalReferenceAttachmentTransformer.toUnifiedSchema`.
 */
export const LEGACY_ENDPOINT_EXTERNAL_REFERENCE_TYPE_ID = 'endpoint';

/**
 * Registers all Security Solution case attachment types with the cases attachment
 * framework. Extracted from `plugin.setup()` so the registrations have a focused
 * unit test surface (in particular the legacy `endpoint` external-reference
 * back-compat registration, which is easy to silently drop in a refactor and
 * which would break existing API clients if it disappeared).
 */
export const registerCaseAttachments = (
  attachmentFramework: CasesServerSetup['attachmentFramework']
): void => {
  attachmentFramework.registerUnified({
    id: SECURITY_ENDPOINT_ATTACHMENT_TYPE,
    schemaValidator: validateEndpointAttachmentMetadata,
  });

  attachmentFramework.registerExternalReference({
    id: LEGACY_ENDPOINT_EXTERNAL_REFERENCE_TYPE_ID,
  });

  attachmentFramework.registerUnified(getEventAttachmentType());
};
