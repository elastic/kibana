/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useMemo, useCallback } from 'react';
import { SecurityPageNameAiSoc } from '@kbn/deeplinks-security';
import { useNormalizedAppLinks } from '@kbn/security-solution-plugin/public';
import type { LinkInfo } from '@kbn/security-solution-plugin/public';

/**
 * Hook to get the link info from the application links.
 */
export const useGetLinkInfo = (): ((id: SecurityPageNameAiSoc) => LinkInfo | undefined) => {
  const normalizedLinks = useNormalizedAppLinks();
  return useCallback(
    (id: SecurityPageNameAiSoc) => {
      const normalizedLink = normalizedLinks[id];
      if (!normalizedLink) {
        return undefined;
      }
      // discards the parentId and creates the linkInfo copy.
      const { parentId, ...linkInfo } = normalizedLink;
      return linkInfo;
    },
    [normalizedLinks]
  );
};

/**
 * Hook to get the link info from an application link by id.
 * It returns the link info or undefined if it does not exist.
 */
export const useLinkInfo = (id: SecurityPageNameAiSoc): LinkInfo | undefined => {
  const getLinkInfo = useGetLinkInfo();
  return useMemo(() => getLinkInfo(id), [getLinkInfo, id]);
};

/**
 * Hook to check if a link exists in the application links,
 * It can be used to know if a link access is authorized.
 */
export const useLinkAuthorized = (id: SecurityPageNameAiSoc): boolean => {
  const linkInfo = useLinkInfo(id);
  return useMemo(() => linkInfo != null && !linkInfo.unauthorized, [linkInfo]);
};
