/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PageObjects, ScoutPage, createLazyPageObject } from '@kbn/scout';
import { AnnotationsApp } from './annotations_app';
import { SLOApp } from './slo_app';

export interface SLOPageObjects extends PageObjects {
  slo: SLOApp;
  annotations: AnnotationsApp;
}

export function extendPageObjects(pageObjects: PageObjects, page: ScoutPage): SLOPageObjects {
  page.setDefaultTimeout(60_000); // Set a default timeout for all page actions
  return {
    ...pageObjects,
    slo: createLazyPageObject(SLOApp, page),
    annotations: createLazyPageObject(AnnotationsApp, page),
  };
}
