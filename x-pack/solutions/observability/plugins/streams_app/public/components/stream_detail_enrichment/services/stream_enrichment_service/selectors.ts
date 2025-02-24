/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SnapshotFrom } from 'xstate5';
import { streamEnrichmentMachine } from './stream_enrichment_state_machine';

export const getProcessorsSnapshots = (state: SnapshotFrom<typeof streamEnrichmentMachine>) =>
  state.context.processors.map((processor) => processor.getSnapshot());
