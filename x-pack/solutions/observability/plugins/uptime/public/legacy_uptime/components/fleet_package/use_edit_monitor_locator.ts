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
import { SharePluginSetup } from '@kbn/share-plugin/public';

export function useEditMonitorLocator({
  configId,
  locators,
}: {
  configId: string;
  locators?: LocatorClient;
}) {
  const [editUrl, setEditUrl] = useState<string | undefined>(undefined);
  const syntheticsLocators = useKibana<{
    share: SharePluginSetup;
  }>().services?.share?.url.locators;
  const locator = (locators || syntheticsLocators)?.get(syntheticsEditMonitorLocatorID);

  useEffect(() => {
    async function generateUrl() {
      const url = await locator?.getUrl({
        configId,
      });
      setEditUrl(url);
    }
    generateUrl();
  }, [locator, configId]);

  return editUrl;
}
