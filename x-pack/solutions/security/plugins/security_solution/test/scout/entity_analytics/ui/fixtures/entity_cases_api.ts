/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SECURITY_ENTITY_ATTACHMENT_TYPE } from '@kbn/cases-plugin/common';
import type { SecurityApiServicesFixture } from '@kbn/scout-security';

// Derive request/response shapes from the scout cases client so this fixture stays
// in sync with it without importing its internal types directly.
type CasesApi = SecurityApiServicesFixture['cases'];
type CreateCaseParams = Parameters<CasesApi['create']>[0];
type CreateCommentParams = Parameters<CasesApi['comments']['create']>[1];
type CreatedCase = Awaited<ReturnType<CasesApi['create']>>['data'];

const CASE_DEFAULTS = {
  connector: { id: 'none', name: 'none', type: '.none', fields: null },
  settings: { syncAlerts: false, extractObservables: false },
  owner: 'securitySolution',
} as const;

/**
 * Reference-attachment payload the `security.entity` type expects (mirrors
 * `generateEntityAttachmentsWithoutOwner` in the security_solution plugin, plus the
 * `owner` the UI injects at creation time). The scout cases client types comments
 * with the legacy `AttachmentRequest` union, which predates unified reference
 * attachments, so we describe the payload here and cast once at the call site.
 */
interface EntityAttachmentRequest {
  type: typeof SECURITY_ENTITY_ATTACHMENT_TYPE;
  attachmentId: string;
  metadata: { entityName: string; entityType: string };
  owner: string;
}

export interface EntityCasesApiFixture {
  /** Create a case via the API with sensible defaults; override any field as needed. */
  createCase: (overrides?: Partial<CreateCaseParams>) => Promise<CreatedCase>;
  /** Create a case and attach a single `security.entity` reference attachment to it. */
  createCaseWithEntityAttachment: (params: {
    entityId: string;
    entityName: string;
    entityType: string;
    caseOverrides?: Partial<CreateCaseParams>;
  }) => Promise<CreatedCase>;
}

/**
 * Builds the entity-cases API data-setup helpers, bound to a single space. Keeping
 * case/attachment creation here (rather than inline in specs) keeps spec bodies to
 * page-object calls and assertions, and gives the two data shapes a single source
 * of truth.
 */
export const createEntityCasesApi = (cases: CasesApi, spaceId: string): EntityCasesApiFixture => {
  const createCase: EntityCasesApiFixture['createCase'] = async (overrides = {}) => {
    const { data } = await cases.create(
      {
        title: `Scout entity case – ${spaceId}`,
        description: 'Created by Scout entity attachment test',
        tags: ['scout'],
        ...CASE_DEFAULTS,
        ...overrides,
      },
      spaceId
    );
    return data;
  };

  const createCaseWithEntityAttachment: EntityCasesApiFixture['createCaseWithEntityAttachment'] =
    async ({ entityId, entityName, entityType, caseOverrides }) => {
      const created = await createCase(caseOverrides);
      const attachment: EntityAttachmentRequest = {
        type: SECURITY_ENTITY_ATTACHMENT_TYPE,
        attachmentId: entityId,
        metadata: { entityName, entityType },
        owner: 'securitySolution',
      };
      await cases.comments.create(
        created.id,
        attachment as unknown as CreateCommentParams,
        spaceId
      );
      return created;
    };

  return { createCase, createCaseWithEntityAttachment };
};
