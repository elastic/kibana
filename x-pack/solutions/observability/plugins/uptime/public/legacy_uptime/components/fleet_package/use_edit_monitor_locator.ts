/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import type { LocatorClient } from '@kbn/share-plugin/common/url_service/locators';
import { syntheticsEditMonitorLocatorID } from '@kbn/observability-plugin/common';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { HttpStart } from '@kbn/core-http-browser';
import type { SharePluginSetup } from '@kbn/share-plugin/public';
import type { Space } from '@kbn/spaces-plugin/common';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import { ALL_SPACES_ID } from '@kbn/spaces-plugin/common';

/**
 * The monitor page only resolves monitors in the active space, so a monitor
 * that lives elsewhere must be opened with an explicit `spaceId`. When the
 * spaces the user can access are known, one of those is preferred.
 */
export const getMonitorSpaceToAppend = (
  activeSpaceId?: string,
  monitorSpaces?: string[],
  accessibleSpaceIds?: string[]
): { spaceId?: string } => {
  if (
    !activeSpaceId ||
    !monitorSpaces?.length ||
    monitorSpaces.includes(ALL_SPACES_ID) ||
    monitorSpaces.includes(activeSpaceId)
  ) {
    return {};
  }
  const accessibleMonitorSpace = monitorSpaces.find((id) => accessibleSpaceIds?.includes(id));
  return { spaceId: accessibleMonitorSpace ?? monitorSpaces[0] };
};

const getAccessibleSpaceIds = async (http?: HttpStart): Promise<string[] | undefined> => {
  try {
    const spaces = await http?.get<Space[]>('/api/spaces/space');
    return spaces?.map(({ id }) => id);
  } catch (e) {
    return undefined;
  }
};

export function useEditMonitorLocator({
  configId,
  monitorSpaces,
  packagePolicyId,
  locators,
}: {
  configId: string;
  monitorSpaces?: string[];
  packagePolicyId?: string;
  locators?: LocatorClient;
}) {
  const [editUrl, setEditUrl] = useState<string | undefined>(undefined);
  const { share, spaces, http } = useKibana<{
    share: SharePluginSetup;
    spaces?: SpacesPluginStart;
    http?: HttpStart;
  }>().services;
  const locator = (locators || share?.url.locators)?.get(syntheticsEditMonitorLocatorID);

  useEffect(() => {
    async function generateUrl() {
      const activeSpace = await spaces?.getActiveSpace().catch(() => undefined);
      const { spaceId } = getMonitorSpaceToAppend(activeSpace?.id, monitorSpaces);
      // Which space to open only needs the user's accessible spaces when there is a choice.
      const accessibleSpaceIds =
        spaceId && monitorSpaces && monitorSpaces.length > 1
          ? await getAccessibleSpaceIds(http)
          : undefined;
      const url = await locator?.getUrl({
        configId,
        packagePolicyId,
        ...getMonitorSpaceToAppend(activeSpace?.id, monitorSpaces, accessibleSpaceIds),
      });
      setEditUrl(url);
    }
    generateUrl();
  }, [locator, configId, packagePolicyId, monitorSpaces, spaces, http]);

  return editUrl;
}
