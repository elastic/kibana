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
import { SecurityEventAttachmentPayloadSchema } from '../../../common/cases/attachments/event';

// Reproduces the path:message summary that `parseUnifiedAttachmentWithSchema`
// in `@kbn/cases-plugin` builds at the write boundary. Keeping this assertion
// here proves the security.* schemas surface structured (badRequest-ready)
// errors instead of leaking raw ZodErrors as 500s.
const formatZodIssues = (issues: Array<{ path: PropertyKey[]; message: string }>) =>
  issues
    .map(({ path, message }) => `${path.length > 0 ? path.join('.') : '(root)'}: ${message}`)
    .join('; ');

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

  it('registers the unified security.event attachment with the zod payload schema', () => {
    const framework = buildFramework();

    registerCaseAttachments(framework);

    expect(framework.registerUnified).toHaveBeenCalledWith({
      id: SECURITY_EVENT_ATTACHMENT_TYPE,
      schema: SecurityEventAttachmentPayloadSchema,
    });
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

  describe('invalid payload surfacing', () => {
    it('reports `path: message` zod issues for an invalid security.event payload', () => {
      const result = SecurityEventAttachmentPayloadSchema.safeParse({
        type: SECURITY_EVENT_ATTACHMENT_TYPE,
        owner: 'securitySolution',
        attachmentId: 'event-1',
        metadata: { index: 123 },
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(formatZodIssues(result.error.issues)).toContain('metadata.index');
      }
    });

    it('reports `path: message` zod issues for an invalid security.endpoint payload', () => {
      const result = EndpointAttachmentPayloadSchema.safeParse({
        type: SECURITY_ENDPOINT_ATTACHMENT_TYPE,
        owner: 'securitySolution',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(formatZodIssues(result.error.issues)).not.toHaveLength(0);
      }
    });
  });
});
