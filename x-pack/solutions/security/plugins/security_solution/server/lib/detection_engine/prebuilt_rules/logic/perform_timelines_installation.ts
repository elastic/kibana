/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { stringifyZodError } from '@kbn/zod-helpers';
import { ImportTimelineResult } from '../../../../../common/api/timeline';
import type { SecuritySolutionApiRequestHandlerContext } from '../../../../types';
import { installPrepackagedTimelines } from '../../../timeline/routes/prepackaged_timelines/install_prepackaged_timelines';

export const performTimelinesInstallation = async (
  securitySolutionContext: SecuritySolutionApiRequestHandlerContext,
  logger?: Logger
) => {
  logger?.debug('performTimelinesInstallation: Installing timelines - started');
  const timeline = await installPrepackagedTimelines(
    securitySolutionContext.getConfig()?.maxTimelineImportExportSize,
    securitySolutionContext.getFrameworkRequest(),
    true
  );
  const parsed = ImportTimelineResult.safeParse(timeline);
  const stringifiedError = parsed.error && stringifyZodError(parsed.error);

  if (stringifiedError) {
    logger?.error(
      `performTimelinesInstallation: Installing timelines - error: ${stringifiedError}`
    );
  } else {
    const timelinesInstalled = parsed.data?.timelines_installed ?? 0;
    const timelinesUpdated = parsed.data?.timelines_updated ?? 0;
    logger?.debug(
      `performTimelinesInstallation: Installing timelines - done. Installed: ${timelinesInstalled}, updated: ${timelinesUpdated}.`
    );
  }

  return {
    result: parsed.data,
    error: stringifiedError,
  };
};
