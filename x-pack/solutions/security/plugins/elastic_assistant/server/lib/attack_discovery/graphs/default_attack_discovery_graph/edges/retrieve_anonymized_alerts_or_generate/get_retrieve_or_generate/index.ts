/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Document } from '@langchain/core/documents';

export const getRetrieveOrGenerate = (
  anonymizedAlerts: Document[]
): 'retrieve_anonymized_alerts' | 'generate' =>
  anonymizedAlerts.length === 0 ? 'retrieve_anonymized_alerts' : 'generate';
