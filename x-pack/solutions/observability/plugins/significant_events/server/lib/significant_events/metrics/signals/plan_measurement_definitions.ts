/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignalFieldPresence } from './check_signal_fields';
import { getSignalVariantFields } from './types';
import type { SignalTemplate, SignalTemplateVariant } from './types';

export interface MeasurementDefinitionPlan {
  variants: SignalTemplateVariant[];
}

const hasVariantFields = (presence: SignalFieldPresence, variant: SignalTemplateVariant): boolean =>
  presence.dataset === variant.dataset &&
  getSignalVariantFields(variant).every((field) => presence.fields.has(field));

const byPreference = (left: SignalTemplateVariant, right: SignalTemplateVariant): number =>
  Number(right.schema === 'otel') - Number(left.schema === 'otel');

/** Selects every variant with data and orders OpenTelemetry first. */
export const planMeasurementDefinition = (
  template: SignalTemplate,
  fieldPresence: readonly SignalFieldPresence[]
): MeasurementDefinitionPlan | undefined => {
  const variants = [...template.variants]
    .sort(byPreference)
    .filter((variant) => fieldPresence.some((presence) => hasVariantFields(presence, variant)));

  return variants.length > 0 ? { variants } : undefined;
};
