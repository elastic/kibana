/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const SIGNAL_INVESTIGATION_ANALYZERS_PATH = '/internal/signal_investigation/analyzers';

export const signalInvestigationLeadsPath = (analyzerId: string): string =>
  `/internal/signal_investigation/leads/${analyzerId}`;
