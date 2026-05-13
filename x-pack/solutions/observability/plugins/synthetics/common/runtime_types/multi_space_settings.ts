/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

// Multi-space Synthetics settings stored in the `synthetics-settings-multi-space`
// saved object. Today it carries only CCS-related fields; future space-scoped
// settings should be added here.
export const syntheticsMultiSpaceSettingsSchema = t.partial({
  useAllRemoteClusters: t.boolean,
  selectedRemoteClusters: t.array(t.string),
});

export type SyntheticsMultiSpaceSettings = t.TypeOf<typeof syntheticsMultiSpaceSettingsSchema>;
