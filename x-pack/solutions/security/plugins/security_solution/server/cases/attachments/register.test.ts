/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SECURITY_ENDPOINT_ATTACHMENT_TYPE,
  SECURITY_EVENT_ATTACHMENT_TYPE,
  INDICATOR_ATTACHMENT_TYPE,
  SECURITY_TIMELINE_ATTACHMENT_TYPE,
} from '@kbn/cases-plugin/common';

import { registerCaseAttachments } from './register';
import { EndpointAttachmentPayloadSchema } from '../../../common/cases/attachments/endpoint';
import { TimelineAttachmentPayloadSchema } from '../../../common/cases/attachments/timeline';

describe('registerCaseAttachments', () => {
  const buildFramework = () => ({
    registerExternalReference: jest.fn(),
    registerPersistableState: jest.fn(),
    registerUnified: jest.fn(),
  });

  it('registers the unified security.endpoint attachment with the zod payload schema', () => {
    const framework = buildFramework();

    registerCaseAttachments(framework);

    expect(framework.registerUnified).toHaveBeenCalledWith({
      id: SECURITY_ENDPOINT_ATTACHMENT_TYPE,
      schema: EndpointAttachmentPayloadSchema,
    });
  });

  it('registers the unified security.event attachment type', () => {
    const framework = buildFramework();

    registerCaseAttachments(framework);

    expect(framework.registerUnified).toHaveBeenCalledWith(
      expect.objectContaining({ id: SECURITY_EVENT_ATTACHMENT_TYPE })
    );
  });

  it('registers the unified security.indicator attachment type with the zod schema', () => {
    const framework = buildFramework();

    registerCaseAttachments(framework);

    expect(framework.registerUnified).toHaveBeenCalledWith(
      expect.objectContaining({
        id: INDICATOR_ATTACHMENT_TYPE,
        schema: expect.anything(),
      })
    );
  });

  it('registers the unified security.timeline attachment with the zod payload schema', () => {
    const framework = buildFramework();

    registerCaseAttachments(framework);

    expect(framework.registerUnified).toHaveBeenCalledWith({
      id: SECURITY_TIMELINE_ATTACHMENT_TYPE,
      schema: TimelineAttachmentPayloadSchema,
    });
  });

  // The cases-plugin routes inbound `externalReferenceAttachmentTypeId: 'endpoint'`
  // payloads through `EXTERNAL_REFERENCE_TYPE_MAP` -> 'security.endpoint' at the
  // validator boundary, so the unified registration above is sufficient for
  // back-compat. No external-reference registration is required.
  it('does not register any external-reference attachment types', () => {
    const framework = buildFramework();

    registerCaseAttachments(framework);

    expect(framework.registerExternalReference).not.toHaveBeenCalled();
  });

  it('does not register any persistable-state attachment types', () => {
    const framework = buildFramework();

    registerCaseAttachments(framework);

    expect(framework.registerPersistableState).not.toHaveBeenCalled();
  });
});
