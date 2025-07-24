/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ScoutPage, createLazyPageObject, ObltPageObjects } from '@kbn/scout-oblt';
import { AnnotationsApp } from './annotations_app';
import { SLOApp } from './slo_app';

export interface SLOPageObjects extends ObltPageObjects {
  slo: SLOApp;
  annotations: AnnotationsApp;
}

export function extendPageObjects(pageObjects: ObltPageObjects, page: ScoutPage): SLOPageObjects {
  return {
    ...pageObjects,
    slo: createLazyPageObject(SLOApp, page),
    annotations: createLazyPageObject(AnnotationsApp, page),
  };
}
