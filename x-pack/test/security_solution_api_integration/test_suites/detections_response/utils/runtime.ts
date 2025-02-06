/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';

interface UpdateMappingsProps {
  es: Client;
  index: string | string[];
}
export const setBrokenRuntimeField = async ({ es, index }: UpdateMappingsProps) => {
  await es.indices.putMapping({
    runtime: {
      broken: {
        type: 'long',
        script: {
          lang: 'painless',
          source:
            "emit(doc['non_existing'].value.dayOfWeekEnum.getDisplayName(TextStyle.FULL, Locale.ENGLISH))",
        },
      },
    },
    index,
  });
};

export const unsetBrokenRuntimeField = async ({ es, index }: UpdateMappingsProps) => {
  await es.indices.putMapping({
    runtime: {
      // https://www.elastic.co/guide/en/elasticsearch/reference/current/runtime-mapping-fields.html#runtime-updating-scripts
      // @ts-expect-error null is valid, see link above
      broken: null,
    },
    index,
  });
};
