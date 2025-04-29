/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsQueryConfig } from '@kbn/es-query';
import { SerializableRecord } from '@kbn/utility-types';
import { useMemo } from 'react';
import { UI_SETTINGS } from '@kbn/data-plugin/public';
import { useUiSetting$ } from '@kbn/kibana-react-plugin/public';

export const useKibanaQuerySettings = (): EsQueryConfig => {
  const [allowLeadingWildcards] = useUiSetting$<boolean>(UI_SETTINGS.QUERY_ALLOW_LEADING_WILDCARDS);
  const [queryStringOptions] = useUiSetting$<SerializableRecord>(UI_SETTINGS.QUERY_STRING_OPTIONS);
  const [dateFormatTZ] = useUiSetting$<string>(UI_SETTINGS.DATEFORMAT_TZ);
  const [ignoreFilterIfFieldNotInIndex] = useUiSetting$<boolean>(
    UI_SETTINGS.COURIER_IGNORE_FILTER_IF_FIELD_NOT_IN_INDEX
  );

  return useMemo(
    () => ({
      allowLeadingWildcards,
      queryStringOptions,
      dateFormatTZ,
      ignoreFilterIfFieldNotInIndex,
    }),
    [allowLeadingWildcards, dateFormatTZ, ignoreFilterIfFieldNotInIndex, queryStringOptions]
  );
};
