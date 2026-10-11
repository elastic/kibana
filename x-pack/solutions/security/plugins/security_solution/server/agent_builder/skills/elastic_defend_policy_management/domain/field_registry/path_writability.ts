/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getFieldRegistryEntry } from './derive_field_registry';

export type PathNotWritableReason =
  | 'unknown_path'
  | 'derived_setting'
  | 'advanced_setting'
  | 'not_user_editable'
  | 'not_supported_by_skill'
  | 'coupled_only';

export type PathWritability =
  | { writable: true }
  | { writable: false; reason: PathNotWritableReason };

const isCoupledOnlyPath = (path: string): boolean =>
  /^(?:windows|mac)\.popup\.device_control\.enabled$/.test(path);

export const describePathWritability = (path: string): PathWritability => {
  const entry = getFieldRegistryEntry(path);
  if (!entry) {
    return { writable: false, reason: 'unknown_path' };
  }
  if (entry.isDerived) {
    return { writable: false, reason: 'derived_setting' };
  }
  if (path.includes('.advanced.')) {
    return { writable: false, reason: 'advanced_setting' };
  }
  if (!entry.userEditable) {
    return { writable: false, reason: 'not_user_editable' };
  }
  if (entry.excludeFromComparison) {
    return { writable: false, reason: 'not_supported_by_skill' };
  }
  if (isCoupledOnlyPath(path)) {
    return { writable: false, reason: 'coupled_only' };
  }
  return { writable: true };
};
