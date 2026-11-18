/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import { firstValueFrom } from 'rxjs';
import type { CoreStart, KibanaRequest, SavedObject } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { SECURITY_EXTENSION_ID } from '@kbn/core-saved-objects-server';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import { NIGHTSHIFT_API_PRIVILEGES, NIGHTSHIFT_ENABLED_FLAG } from '@kbn/nightshift-shared';
import {
  MAX_CUSTOM_CONTEXT_AUTHOR_NAME_LENGTH,
  MAX_CUSTOM_CONTEXT_SNIPPETS,
  MAX_CUSTOM_CONTEXT_SNIPPET_LENGTH,
  MAX_CUSTOM_CONTEXT_TOTAL_LENGTH,
  formatCustomContextInstructions,
  type CustomContextSnippet,
  type GetCustomContextResponse,
  type PutCustomContextRequest,
  type PutCustomContextResponse,
} from '../../common/custom_context';
import {
  NIGHTSHIFT_CUSTOM_CONTEXT_SO_ID,
  NIGHTSHIFT_CUSTOM_CONTEXT_SO_TYPE,
  type NightshiftCustomContextAttributes,
} from '../saved_objects';
import {
  CustomContextConflictError,
  CustomContextDisabledError,
  CustomContextValidationError,
} from './errors';

export interface CustomContextClient {
  /** Throws {@link CustomContextDisabledError} unless the `nightshift.enabled` flag is on. */
  get: (request: KibanaRequest) => Promise<GetCustomContextResponse>;
  /** Throws {@link CustomContextDisabledError} unless the `nightshift.enabled` flag is on. */
  replace: (
    request: KibanaRequest,
    params: PutCustomContextRequest
  ) => Promise<PutCustomContextResponse>;
  /**
   * The space's snippets formatted for the agent's system prompt; empty when there are none or
   * when the caller lacks the Nightshift read privilege in that space.
   */
  getInstructions: (request: KibanaRequest, spaceId: string) => Promise<string>;
}

export interface CustomContextClientDeps {
  featureFlags?: CoreStart['featureFlags'];
  savedObjects?: CoreStart['savedObjects'];
  security?: CoreStart['security'];
  securityPlugin?: SecurityPluginStart;
  spaces?: SpacesPluginStart;
}

const UNKNOWN_AUTHOR = 'Unknown';

const validateSnippets = (snippets: ReadonlyArray<{ text: string }>): void => {
  if (snippets.length > MAX_CUSTOM_CONTEXT_SNIPPETS) {
    throw new CustomContextValidationError(
      `At most ${MAX_CUSTOM_CONTEXT_SNIPPETS} snippets are allowed`
    );
  }
  let totalLength = 0;
  for (const { text } of snippets) {
    if (text.length > MAX_CUSTOM_CONTEXT_SNIPPET_LENGTH) {
      throw new CustomContextValidationError(
        `Each snippet must be at most ${MAX_CUSTOM_CONTEXT_SNIPPET_LENGTH} characters`
      );
    }
    totalLength += text.length;
  }
  if (totalLength > MAX_CUSTOM_CONTEXT_TOTAL_LENGTH) {
    throw new CustomContextValidationError(
      `Snippets must be at most ${MAX_CUSTOM_CONTEXT_TOTAL_LENGTH} characters in total`
    );
  }
};

/**
 * Creates the client for the per-space custom context object, whose snippets are appended to the
 * investigation agent's system prompt.
 */
export const createCustomContextClient = ({
  getDeps,
}: {
  getDeps: () => CustomContextClientDeps;
}): CustomContextClient => {
  const getSpaceId = (request: KibanaRequest): string =>
    getDeps().spaces?.spacesService.getSpaceId(request) ?? DEFAULT_SPACE_ID;

  // Access is authorized by the route privileges, and the agent reads the snippets on behalf of
  // whoever runs it, so the security extension is skipped.
  const getSavedObjectsClient = (request: KibanaRequest, spaceId: string) => {
    const { savedObjects } = getDeps();
    if (!savedObjects) {
      throw new Error('savedObjects is not available — plugin start() has not been called');
    }
    return savedObjects
      .getScopedClient(request, {
        excludedExtensions: [SECURITY_EXTENSION_ID],
        includedHiddenTypes: [NIGHTSHIFT_CUSTOM_CONTEXT_SO_TYPE],
      })
      .asScopedToNamespace(spaceId);
  };

  const getCustomContextObject = async (
    request: KibanaRequest,
    spaceId: string
  ): Promise<SavedObject<NightshiftCustomContextAttributes> | undefined> => {
    try {
      return await getSavedObjectsClient(request, spaceId).get<NightshiftCustomContextAttributes>(
        NIGHTSHIFT_CUSTOM_CONTEXT_SO_TYPE,
        NIGHTSHIFT_CUSTOM_CONTEXT_SO_ID
      );
    } catch (err) {
      if (SavedObjectsErrorHelpers.isNotFoundError(err)) {
        return undefined;
      }
      throw err;
    }
  };

  const assertNightshiftEnabled = async (): Promise<void> => {
    const { featureFlags } = getDeps();
    const enabled = featureFlags
      ? await firstValueFrom(featureFlags.getBooleanValue$(NIGHTSHIFT_ENABLED_FLAG, false))
      : false;
    if (!enabled) {
      throw new CustomContextDisabledError();
    }
  };

  // The agent is callable without Nightshift privileges, so prompt-time reads must check the
  // read privilege the GET route enforces. Deny by default when privileges cannot be verified.
  const canReadCustomContext = async (request: KibanaRequest): Promise<boolean> => {
    const { securityPlugin } = getDeps();
    if (!securityPlugin) {
      return false;
    }
    const { authz } = securityPlugin;
    if (!authz.mode.useRbacForRequest(request)) {
      return true;
    }
    const { hasAllRequested } = await authz.checkPrivilegesDynamicallyWithRequest(request)({
      kibana: [authz.actions.api.get(NIGHTSHIFT_API_PRIVILEGES.read)],
    });
    return hasAllRequested;
  };

  const getAuthorName = (request: KibanaRequest): string => {
    const user = getDeps().security?.authc.getCurrentUser(request);
    const name = user?.full_name || user?.username || UNKNOWN_AUTHOR;
    return name.slice(0, MAX_CUSTOM_CONTEXT_AUTHOR_NAME_LENGTH);
  };

  return {
    get: async (request) => {
      await assertNightshiftEnabled();
      const existing = await getCustomContextObject(request, getSpaceId(request));
      if (!existing) {
        return { snippets: [] };
      }
      return { snippets: existing.attributes.snippets ?? [], version: existing.version };
    },

    replace: async (request, { snippets, version }) => {
      await assertNightshiftEnabled();
      const kept = snippets
        .map(({ id, text }) => ({ id, text: text.trim() }))
        .filter(({ text }) => text.length > 0);
      validateSnippets(kept);

      const spaceId = getSpaceId(request);
      const existing = await getCustomContextObject(request, spaceId);
      // Once an object exists, every write must prove it saw the latest version so a concurrent
      // editor's snippets are not silently discarded. Only the first write may omit it.
      if (existing && !version) {
        throw new CustomContextConflictError();
      }

      const existingById = new Map(
        (existing?.attributes.snippets ?? []).map((snippet) => [snippet.id, snippet])
      );
      const authorName = getAuthorName(request);
      const now = new Date().toISOString();
      const nextSnippets: CustomContextSnippet[] = kept.map(({ id, text }) => {
        const previous = id ? existingById.get(id) : undefined;
        if (!previous) {
          return { id: randomUUID(), text, author_name: authorName, created_at: now };
        }
        if (previous.text === text) {
          return previous;
        }
        return { ...previous, text, updated_by: authorName, updated_at: now };
      });

      try {
        const saved = await getSavedObjectsClient(
          request,
          spaceId
        ).create<NightshiftCustomContextAttributes>(
          NIGHTSHIFT_CUSTOM_CONTEXT_SO_TYPE,
          { snippets: nextSnippets },
          existing
            ? { id: NIGHTSHIFT_CUSTOM_CONTEXT_SO_ID, overwrite: true, version }
            : { id: NIGHTSHIFT_CUSTOM_CONTEXT_SO_ID }
        );
        return { snippets: nextSnippets, version: saved.version };
      } catch (err) {
        if (SavedObjectsErrorHelpers.isConflictError(err)) {
          throw new CustomContextConflictError();
        }
        throw err;
      }
    },

    getInstructions: async (request, spaceId) => {
      if (!(await canReadCustomContext(request))) {
        return '';
      }
      const existing = await getCustomContextObject(request, spaceId);
      return formatCustomContextInstructions(existing?.attributes.snippets ?? []);
    },
  };
};
