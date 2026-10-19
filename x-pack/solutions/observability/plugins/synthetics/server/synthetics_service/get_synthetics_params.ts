/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALL_SPACES_ID } from '@kbn/spaces-plugin/common/constants';
import type { SyntheticsServerSetup } from '../types';
import { syntheticsParamType } from '../../common/types/saved_objects';
import type { SyntheticsParams } from '../../common/runtime_types';

/** Reads the decrypted global params, grouped by the space they apply to. */
export const getSyntheticsParams = async (
  server: SyntheticsServerSetup,
  {
    spaceId,
    hideParams = false,
    canSave = true,
  }: { spaceId?: string; canSave?: boolean; hideParams?: boolean } = {}
): Promise<Record<string, Record<string, string>>> => {
  if (!canSave) {
    return Object.create(null);
  }
  const encryptedClient = server.encryptedSavedObjects.getClient();

  const paramsBySpace: Record<string, Record<string, string>> = Object.create(null);

  const finder =
    await encryptedClient.createPointInTimeFinderDecryptedAsInternalUser<SyntheticsParams>({
      type: syntheticsParamType,
      perPage: 1000,
      namespaces: spaceId ? [spaceId] : [ALL_SPACES_ID],
    });

  for await (const response of finder.find()) {
    response.saved_objects.forEach((param) => {
      param.namespaces?.forEach((namespace) => {
        if (!paramsBySpace[namespace]) {
          paramsBySpace[namespace] = Object.create(null);
        }
        paramsBySpace[namespace][param.attributes.key] = hideParams
          ? '"*******"'
          : param.attributes.value;
      });
    });
  }

  // no need to wait here
  finder.close().catch(() => {});

  if (paramsBySpace[ALL_SPACES_ID]) {
    Object.keys(paramsBySpace).forEach((space) => {
      if (space !== ALL_SPACES_ID) {
        paramsBySpace[space] = {
          ...(paramsBySpace[space] ?? {}),
          ...(paramsBySpace[ALL_SPACES_ID] ?? {}),
        };
      }
    });
    if (spaceId) {
      paramsBySpace[spaceId] = {
        ...(paramsBySpace?.[spaceId] ?? {}),
        ...(paramsBySpace?.[ALL_SPACES_ID] ?? {}),
      };
    }
  }

  return paramsBySpace;
};
