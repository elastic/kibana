/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage, ObltPageObjects, ScoutTestConfig } from '@kbn/scout-oblt';
import { createLazyPageObject } from '@kbn/scout-oblt';
import { AnnotationsApp } from './annotations_app';
import { SLOApp } from './slo_app';

export interface SLOPageObjects extends ObltPageObjects {
  slo: SLOApp;
  annotations: AnnotationsApp;
}

export function extendPageObjects(
  pageObjects: ObltPageObjects,
  page: ScoutPage,
  config: ScoutTestConfig
): SLOPageObjects {
  return {
    ...pageObjects,
    slo: createLazyPageObject(SLOApp, page, config),
    annotations: createLazyPageObject(AnnotationsApp, page),
  };
}
