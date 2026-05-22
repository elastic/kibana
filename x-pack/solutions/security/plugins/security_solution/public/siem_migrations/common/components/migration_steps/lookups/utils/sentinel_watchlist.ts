/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  SentinelWatchlistResource,
  SentinelWatchlistTemplate,
} from '../../../../../../../common/siem_migrations/model/vendor/common/sentinel.gen';
import type { SiemMigrationResourceData } from '../../../../../../../common/siem_migrations/model/common.gen';

export interface ConvertSentinelWatchlistToResourceParams {
  fileContent: string;
  fallbackName: string;
}

export const convertSentinelWatchlistToResource = ({
  fileContent,
}: ConvertSentinelWatchlistToResourceParams): SiemMigrationResourceData => {
  const parsed = parseSentinelWatchlist(fileContent);

  return {
    type: 'watchlist',
    name: parsed.properties.watchlistAlias,
    content: fileContent,
  };
};

const parseSentinelWatchlist = (fileContent: string): SentinelWatchlistResource => {
  let parsed: unknown;

  try {
    parsed = JSON.parse(fileContent);
  } catch (error) {
    throw new Error(
      i18n.translate(
        'xpack.securitySolution.siemMigrations.common.dataInputFlyout.fileUploadError.sentinelWatchlistInvalidJsonErrorMessage',
        { defaultMessage: 'Sentinel watchlist must be valid JSON.' }
      )
    );
  }

  const result = SentinelWatchlistResource.safeParse(parsed);
  if (result.success) {
    return result.data;
  }

  const templateResult = SentinelWatchlistTemplate.safeParse(parsed);
  if (templateResult.success) {
    return templateResult.data.resources[0];
  }

  throw new Error(
    i18n.translate(
      'xpack.securitySolution.siemMigrations.common.dataInputFlyout.fileUploadError.sentinelWatchlistInvalidSchemaErrorMessage',
      {
        defaultMessage: `Sentinel watchlist must be an ARM watchlist resource or template with watchlistAlias and rawContent.`,
      }
    )
  );
};
