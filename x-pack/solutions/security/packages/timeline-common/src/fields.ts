/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldSpec } from '@kbn/data-plugin/common';

type FieldCategoryName = string;

export interface FieldCategory {
  fields: Record<string, Partial<FieldSpec>>;
}

/**
 * @deprecated use fields list on dataview / "indexPattern"
 * about to use browserFields? Reconsider! Maybe you can accomplish
 * everything you need via the `fields` property on the data view
 * you are working with? Or perhaps you need a description for a
 * particular field? Consider using the EcsFlat module from `@kbn/ecs`
 */
export type BrowserFields = Record<FieldCategoryName, FieldCategory>;

export const EMPTY_BROWSER_FIELDS = {};
