/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fetchQueryAttacks } from '../../containers/detection_engine/alerts/api';

/**
 * Returns the fetch method for attacks page search queries.
 */
export const useAttacksPageFetchMethod = () => fetchQueryAttacks;
