/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SECURITY_ENDPOINT_ATTACHMENT_TYPE,
  SECURITY_EVENT_ATTACHMENT_TYPE,
} from '@kbn/cases-plugin/common';

import { LEGACY_ENDPOINT_EXTERNAL_REFERENCE_TYPE_ID, registerCaseAttachments } from './register';

describe('registerCaseAttachments', () => {
  const buildFramework = () => ({
    registerExternalReference: jest.fn(),
    registerPersistableState: jest.fn(),
    registerUnified: jest.fn(),
  });

  it('registers the unified security.endpoint attachment type with the metadata validator', () => {
    const framework = buildFramework();

    registerCaseAttachments(framework);

    expect(framework.registerUnified).toHaveBeenCalledWith(
      expect.objectContaining({
        id: SECURITY_ENDPOINT_ATTACHMENT_TYPE,
        schemaValidator: expect.any(Function),
      })
    );
  });

  it('registers the unified security.event attachment type', () => {
    const framework = buildFramework();

    registerCaseAttachments(framework);

    expect(framework.registerUnified).toHaveBeenCalledWith(
      expect.objectContaining({ id: SECURITY_EVENT_ATTACHMENT_TYPE })
    );
  });

  // Regression: addresses @szwarckonrad review comment on PR #260544.
  // Dropping this registration is a silent breaking change for any API client
  // still POSTing the legacy shape
  // `{ type: 'externalReference', externalReferenceAttachmentTypeId: 'endpoint', ... }`.
  // Such clients would receive `400 "Attachment type endpoint is not registered."`
  // even though the cases server's external-reference transformer can still
  // round-trip the resulting SO into the unified `security.endpoint` shape on read.
  it('keeps the legacy `endpoint` external-reference type registered for back-compat', () => {
    const framework = buildFramework();

    registerCaseAttachments(framework);

    expect(framework.registerExternalReference).toHaveBeenCalledTimes(1);
    expect(framework.registerExternalReference).toHaveBeenCalledWith({
      id: LEGACY_ENDPOINT_EXTERNAL_REFERENCE_TYPE_ID,
    });
    expect(LEGACY_ENDPOINT_EXTERNAL_REFERENCE_TYPE_ID).toBe('endpoint');
  });

  it('does not register any persistable-state attachment types', () => {
    const framework = buildFramework();

    registerCaseAttachments(framework);

    expect(framework.registerPersistableState).not.toHaveBeenCalled();
  });

  it('registers exactly the three expected attachment types', () => {
    const framework = buildFramework();

    registerCaseAttachments(framework);

    expect(framework.registerUnified).toHaveBeenCalledTimes(2);
    expect(framework.registerExternalReference).toHaveBeenCalledTimes(1);
  });
});
