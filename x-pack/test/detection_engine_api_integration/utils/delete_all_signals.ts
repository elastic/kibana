/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';

const defaultSignalsIndex = '.alerts-security.alerts-default';

/**
 * Remove all signals from the signals index
 * @param es The ElasticSearch handle
 * @param index The signals index to be deleted from
 */
export const deleteAllSignals = async (es: Client, index = defaultSignalsIndex): Promise<void> => {
  await es.deleteByQuery({
    index,
    query: { match_all: {} },
    wait_for_completion: true,
    refresh: true,
  });
};
