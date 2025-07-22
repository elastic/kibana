/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { LocatorClient } from '@kbn/share-plugin/common/url_service/locators';
import { syntheticsEditMonitorLocatorID } from '@kbn/observability-plugin/common';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { Space } from '@kbn/spaces-plugin/common';
import { ALL_SPACES_ID } from '@kbn/security-plugin/public';
import { useKibanaSpace } from '../../../hooks/use_kibana_space';
import { ClientPluginsStart } from '../../../plugin';

export const getMonitorSpaceToAppend = (space?: Space, spaces?: string[]) => {
  if (spaces?.includes(ALL_SPACES_ID)) {
    return {};
  }
  return space && spaces?.length && !spaces?.includes(space?.id) ? { spaceId: spaces[0] } : {};
};

export function useEditMonitorLocator({
  configId,
  locators,
  spaces,
}: {
  configId: string;
  spaces?: string[];
  locators?: LocatorClient;
}) {
  const { space } = useKibanaSpace();

  const [editUrl, setEditUrl] = useState<string | undefined>(undefined);
  const syntheticsLocators = useKibana<ClientPluginsStart>().services.share?.url.locators;
  const locator = (locators || syntheticsLocators)?.get(syntheticsEditMonitorLocatorID);

  useEffect(() => {
    async function generateUrl() {
      const url = await locator?.getUrl({
        configId,
        ...getMonitorSpaceToAppend(space, spaces),
      });
      setEditUrl(url);
    }
    generateUrl();
  }, [locator, configId, space, spaces]);

  return editUrl;
}
