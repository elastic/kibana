/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchAttacksRequestBody } from '../../../../../common/api/detection_engine/attacks';
import type { QueryAlertsBodyParams } from '../../../../../common/api/detection_engine/signals';

/**
 * Translates attacks search request params into Elasticsearch search params.
 * When `ids` is provided, it is merged into the query as a `terms` filter on `_id`.
 */
export const buildSearchAttacksParams = ({
  ids,
  ...searchParams
}: SearchAttacksRequestBody): QueryAlertsBodyParams => {
  if (ids == null) {
    return searchParams;
  }

  const idsFilter = { terms: { _id: ids } };
  const query =
    searchParams.query == null
      ? { bool: { filter: idsFilter } }
      : { bool: { filter: [idsFilter, searchParams.query] } };

  return {
    ...searchParams,
    query,
  };
};
