/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ObltTestFixtures, ObltWorkerFixtures } from '@kbn/scout-oblt';
import { mergeTests, test as base } from '@kbn/scout-oblt';
import type { SynthtraceFixture } from '@kbn/scout-synthtrace';
import { synthtraceFixture } from '@kbn/scout-synthtrace';

const baseWithSynthtrace = mergeTests(base, synthtraceFixture);

export const test = baseWithSynthtrace.extend<
  ObltTestFixtures,
  ObltWorkerFixtures & SynthtraceFixture
>({});
