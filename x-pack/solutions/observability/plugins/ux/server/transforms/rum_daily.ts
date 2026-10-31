/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import {
  canUseDailyRollup,
  emptyBrowserDailyStatus,
  emptyPagesDailyStatus,
  emptyServiceDailyStatus,
  RUM_BROWSER_DAILY_INDEX,
  RUM_BROWSER_DAILY_PIPELINE_NAME,
  RUM_BROWSER_DAILY_TEMPLATE_NAME,
  RUM_BROWSER_DAILY_TRANSFORM_ID,
  RUM_DAILY_VERSION,
  RUM_PAGES_DAILY_INDEX,
  RUM_PAGES_DAILY_PIPELINE_NAME,
  RUM_PAGES_DAILY_TEMPLATE_NAME,
  RUM_PAGES_DAILY_TRANSFORM_ID,
  RUM_SERVICE_DAILY_INDEX,
  RUM_SERVICE_DAILY_PIPELINE_NAME,
  RUM_SERVICE_DAILY_TEMPLATE_NAME,
  RUM_SERVICE_DAILY_TRANSFORM_ID,
  shouldQueryDailyIndex,
  type RumRollupStatus,
} from '../../common/rum_daily';
import {
  buildRumBrowserDailyTransformBody,
  buildRumPagesDailyTransformBody,
  buildRumServiceDailyTransformBody,
  rumBrowserDailyIndexTemplate,
  rumDailyDestPipeline,
  rumPagesDailyIndexTemplate,
  rumServiceDailyIndexTemplate,
} from './rum_daily_spec';

type DailyIndexTemplate = typeof rumPagesDailyIndexTemplate;
import {
  ensureDestIndex,
  installedSyncDelay,
  putOrReplaceTransform,
  readRollupStatus,
  removePreviousTransform,
  restartUnhealthyTransform,
  startTransformIgnoreRunning,
  updateTransformSyncDelay,
  type PutTransformBody,
} from './rum_transform_utils';

export const getRumDailyStatuses = async (
  client: ElasticsearchClient
): Promise<{
  pagesDaily: RumRollupStatus;
  serviceDaily: RumRollupStatus;
  browserDaily: RumRollupStatus;
}> => {
  const [pagesDaily, serviceDaily, browserDaily] = await Promise.all([
    readRollupStatus(client, {
      transformId: RUM_PAGES_DAILY_TRANSFORM_ID,
      index: RUM_PAGES_DAILY_INDEX,
    }),
    readRollupStatus(client, {
      transformId: RUM_SERVICE_DAILY_TRANSFORM_ID,
      index: RUM_SERVICE_DAILY_INDEX,
    }),
    readRollupStatus(client, {
      transformId: RUM_BROWSER_DAILY_TRANSFORM_ID,
      index: RUM_BROWSER_DAILY_INDEX,
    }),
  ]);
  return { pagesDaily, serviceDaily, browserDaily };
};

const ensureOneDailyTransform = async ({
  client,
  logger,
  transformId,
  index,
  templateName,
  template,
  pipelineName,
  body,
  syncDelay,
}: {
  client: ElasticsearchClient;
  logger?: Logger;
  transformId: string;
  index: string;
  templateName: string;
  template: DailyIndexTemplate;
  pipelineName: string;
  body: PutTransformBody;
  syncDelay: string;
}): Promise<void> => {
  await client.ingest.putPipeline({
    id: pipelineName,
    ...rumDailyDestPipeline,
  });
  await client.indices.putIndexTemplate({
    name: templateName,
    ...template,
  });
  await ensureDestIndex(client, index);

  if (RUM_DAILY_VERSION > 1) {
    await removePreviousTransform({
      client,
      logger,
      previousId: transformId.replace(/-\d+$/, `-${RUM_DAILY_VERSION - 1}`),
    });
  }

  await putOrReplaceTransform({
    client,
    logger,
    transformId,
    version: RUM_DAILY_VERSION,
    deleteDestOnReplace: true,
    body,
    onUnchanged: async (currentDelay) => {
      await updateTransformSyncDelay({
        client,
        logger,
        transformId,
        currentDelay,
        delay: syncDelay,
      });
    },
  });
  await startTransformIgnoreRunning(client, transformId);
};

export const ensureRumDailyTransforms = async ({
  client,
  logger,
  syncDelay,
}: {
  client: ElasticsearchClient;
  logger?: Logger;
  syncDelay: string;
}): Promise<{
  pagesDaily: RumRollupStatus;
  serviceDaily: RumRollupStatus;
  browserDaily: RumRollupStatus;
}> => {
  await ensureOneDailyTransform({
    client,
    logger,
    transformId: RUM_PAGES_DAILY_TRANSFORM_ID,
    index: RUM_PAGES_DAILY_INDEX,
    templateName: RUM_PAGES_DAILY_TEMPLATE_NAME,
    template: rumPagesDailyIndexTemplate,
    pipelineName: RUM_PAGES_DAILY_PIPELINE_NAME,
    body: buildRumPagesDailyTransformBody(syncDelay),
    syncDelay,
  });
  await ensureOneDailyTransform({
    client,
    logger,
    transformId: RUM_SERVICE_DAILY_TRANSFORM_ID,
    index: RUM_SERVICE_DAILY_INDEX,
    templateName: RUM_SERVICE_DAILY_TEMPLATE_NAME,
    template: rumServiceDailyIndexTemplate,
    pipelineName: RUM_SERVICE_DAILY_PIPELINE_NAME,
    body: buildRumServiceDailyTransformBody(syncDelay),
    syncDelay,
  });
  await ensureOneDailyTransform({
    client,
    logger,
    transformId: RUM_BROWSER_DAILY_TRANSFORM_ID,
    index: RUM_BROWSER_DAILY_INDEX,
    templateName: RUM_BROWSER_DAILY_TEMPLATE_NAME,
    template: rumBrowserDailyIndexTemplate,
    pipelineName: RUM_BROWSER_DAILY_PIPELINE_NAME,
    body: buildRumBrowserDailyTransformBody(syncDelay),
    syncDelay,
  });
  return getRumDailyStatuses(client);
};

export const reconcileRumDailyTransforms = async ({
  client,
  logger,
  syncDelay,
}: {
  client: ElasticsearchClient;
  logger: Logger;
  syncDelay: string;
}): Promise<void> => {
  const { pagesDaily, serviceDaily, browserDaily } = await getRumDailyStatuses(client);
  for (const status of [pagesDaily, serviceDaily, browserDaily]) {
    if (!status.installed) {
      continue;
    }
    try {
      const current = await client.transform.getTransform({
        transform_id: status.transformId,
      });
      await updateTransformSyncDelay({
        client,
        logger,
        transformId: status.transformId,
        currentDelay: installedSyncDelay(current),
        delay: syncDelay,
      });
    } catch {
      // transform missing or update not supported
    }
    await restartUnhealthyTransform({ client, logger, status });
  }
};

export const resolveRumDaily = ({
  pagesDaily,
  serviceDaily,
  browserDaily,
  analyticsMode,
  rangeFrom,
  rangeTo,
  ...filters
}: {
  pagesDaily?: RumRollupStatus;
  serviceDaily?: RumRollupStatus;
  browserDaily?: RumRollupStatus;
  analyticsMode?: string;
  rangeFrom?: string;
  rangeTo?: string;
  browser?: string;
  os?: string;
  location?: string;
  user?: string;
  kuery?: string;
  frustration?: string;
  breakpoint?: string;
  connection?: string;
  device?: string;
  errorGroup?: string;
  pageUrl?: string;
}): { usePages: boolean; useService: boolean; useBrowser: boolean } => {
  if (!canUseDailyRollup(filters)) {
    return { usePages: false, useService: false, useBrowser: false };
  }
  if (filters.browser) {
    return {
      usePages: false,
      useService: false,
      useBrowser: shouldQueryDailyIndex({
        installed: browserDaily?.installed ?? false,
        watermark: browserDaily?.watermark,
        analyticsMode,
        rangeFrom,
        rangeTo,
      }),
    };
  }
  return {
    usePages: shouldQueryDailyIndex({
      installed: pagesDaily?.installed ?? false,
      watermark: pagesDaily?.watermark,
      analyticsMode,
      rangeFrom,
      rangeTo,
    }),
    useService: shouldQueryDailyIndex({
      installed: serviceDaily?.installed ?? false,
      watermark: serviceDaily?.watermark,
      analyticsMode,
      rangeFrom,
      rangeTo,
    }),
    useBrowser: false,
  };
};

export const emptyDailyStatuses = (): {
  pagesDaily: RumRollupStatus;
  serviceDaily: RumRollupStatus;
  browserDaily: RumRollupStatus;
} => ({
  pagesDaily: emptyPagesDailyStatus(),
  serviceDaily: emptyServiceDailyStatus(),
  browserDaily: emptyBrowserDailyStatus(),
});
