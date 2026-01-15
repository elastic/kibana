/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { stringifyZodError } from '@kbn/zod-helpers';
import { ImportTimelineResult } from '../../../../../common/api/timeline';
import { installPrepackagedTimelines } from '../../../timeline/routes/prepackaged_timelines/install_prepackaged_timelines';
import type { FrameworkRequest } from '../../../framework';

export const performTimelinesInstallation = async ({
  maxTimelineImportExportSize,
  frameworkRequest,
}: {
  maxTimelineImportExportSize: number;
  frameworkRequest: FrameworkRequest;
}) => {
  const timeline = await installPrepackagedTimelines(
    maxTimelineImportExportSize,
    frameworkRequest,
    true
  );
  const parsed = ImportTimelineResult.safeParse(timeline);

  return {
    result: parsed.data,
    error: parsed.error && stringifyZodError(parsed.error),
  };
};
