/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LocatorClient } from '@kbn/share-plugin/common/url_service/locators';
import { syntheticsEditMonitorLocatorID } from '@kbn/observability-plugin/common';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useFetcher } from '@kbn/observability-shared-plugin/public';
import { useKibanaSpace } from '../../../hooks/use_kibana_space';
import { ClientPluginsStart } from '../../../plugin';

export function useEditMonitorLocator({
  configId,
  locators,
  spaceId,
}: {
  configId: string;
  spaceId?: string;
  locators?: LocatorClient;
}) {
  const { space } = useKibanaSpace();

  const syntheticsLocators = useKibana<ClientPluginsStart>().services.share?.url.locators;
  const locator = (locators || syntheticsLocators)?.get(syntheticsEditMonitorLocatorID);

  const { data } = useFetcher(() => {
    return locator?.getUrl({
      configId,
      ...(spaceId && spaceId !== space?.id ? { spaceId } : {}),
    });
  }, [locator, configId, space, spaceId]);

  return data;
}
