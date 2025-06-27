/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useMemo, useCallback } from 'react';
import useObservable from 'react-use/lib/useObservable';
import type { SecurityPageName } from '@kbn/security-solution-navigation';
import memoizeOne from 'memoize-one';
import { isEqual } from 'lodash';
import type { LinkInfo, NormalizedLink, NormalizedLinks } from './types';
import { applicationLinksUpdater } from '../../app/links/application_links_updater';

/**
 * Hook to get the normalized app links updated value
 */
export const useNormalizedAppLinks = (): NormalizedLinks =>
  useObservable(
    applicationLinksUpdater.normalizedLinks$,
    applicationLinksUpdater.getNormalizedLinksValue()
  );

/**
 * Hook to get the link info from the application links.
 */
export const useGetLinkInfo = (): ((id: SecurityPageName) => LinkInfo | undefined) => {
  const normalizedLinks = useNormalizedAppLinks();
  return useCallback(
    (id: SecurityPageName) => {
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
export const useLinkInfo = (id: SecurityPageName): LinkInfo | undefined => {
  const getLinkInfo = useGetLinkInfo();
  return useMemo(() => getLinkInfo(id), [getLinkInfo, id]);
};

/**
 * Hook to check if a link exists in the application links,
 * It can be used to know if a link access is authorized.
 */
export const useLinkAuthorized = (id: SecurityPageName): boolean => {
  const linkInfo = useLinkInfo(id);
  return useMemo(() => linkInfo != null && !linkInfo.unauthorized, [linkInfo]);
};

/**
 * Returns the `LinkInfo` of all the ancestors to the parameter id link, also included.
 */
export const useParentLinks = (id: SecurityPageName): LinkInfo[] => {
  const normalizedLinks = useNormalizedAppLinks();

  return useMemo(() => {
    const ancestors: LinkInfo[] = [];
    let currentId: SecurityPageName | undefined = id;
    while (currentId) {
      const normalizedLink: NormalizedLink | undefined = normalizedLinks[currentId];
      if (normalizedLink) {
        const { parentId, ...linkInfo }: NormalizedLink = normalizedLink;
        ancestors.push(linkInfo);
        currentId = parentId;
      } else {
        currentId = undefined;
      }
    }
    return ancestors.reverse();
  }, [normalizedLinks, id]);
};

/**
 * Hook that returns a function to update a specific link configuration.
 * It takes the `SecurityPageName` id and a partial `LinkInfo` object to update the link.
 * The function will update the links observable and trigger a re-render of components that depend on the links.
 * Use with caution, as it will also trigger an update of the plugin deepLinks configuration as well.
 */
type UpdateLinkConfig = (id: SecurityPageName, update: Partial<Omit<LinkInfo, 'id'>>) => void;
export const useUpdateLinkConfig = (): UpdateLinkConfig => {
  const updateLinkConfig = useMemo<UpdateLinkConfig>(
    () =>
      // make sure to only update if the update is different, this is important to avoid unnecessary updates
      memoizeOne<UpdateLinkConfig>((id, update) => {
        applicationLinksUpdater.updateAppLink(id, update);
      }, isEqual), // deep equality check
    []
  );
  return updateLinkConfig;
};
