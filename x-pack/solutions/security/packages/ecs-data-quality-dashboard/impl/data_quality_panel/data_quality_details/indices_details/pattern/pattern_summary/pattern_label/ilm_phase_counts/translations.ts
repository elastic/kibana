/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const UNMANAGED_PATTERN_TOOLTIP = ({
  indices,
  pattern,
}: {
  indices: number;
  pattern: string;
}) =>
  i18n.translate('securitySolutionPackages.ecsDataQualityDashboard.unmanagedPatternTooltip', {
    values: { indices, pattern },
    defaultMessage: `{indices} {indices, plural, =1 {index} other {indices}} matching the {pattern} pattern {indices, plural, =1 {is} other {are}} unmanaged by Index Lifecycle Management (ILM)`,
  });

export const WARM_PATTERN_TOOLTIP = ({ indices, pattern }: { indices: number; pattern: string }) =>
  i18n.translate('securitySolutionPackages.ecsDataQualityDashboard.warmPatternTooltip', {
    values: { indices, pattern },
    defaultMessage:
      '{indices} {indices, plural, =1 {index} other {indices}} matching the {pattern} pattern {indices, plural, =1 {is} other {are}} warm. Warm indices are no longer being updated but are still being queried.',
  });

export const HOT_PATTERN_TOOLTIP = ({ indices, pattern }: { indices: number; pattern: string }) =>
  i18n.translate('securitySolutionPackages.ecsDataQualityDashboard.hotPatternTooltip', {
    values: { indices, pattern },
    defaultMessage:
      '{indices} {indices, plural, =1 {index} other {indices}} matching the {pattern} pattern {indices, plural, =1 {is} other {are}} hot. Hot indices are actively being updated and queried.',
  });

export const FROZEN_PATTERN_TOOLTIP = ({
  indices,
  pattern,
}: {
  indices: number;
  pattern: string;
}) =>
  i18n.translate('securitySolutionPackages.ecsDataQualityDashboard.frozenPatternTooltip', {
    values: { indices, pattern },
    defaultMessage: `{indices} {indices, plural, =1 {index} other {indices}} matching the {pattern} pattern {indices, plural, =1 {is} other {are}} frozen. Frozen indices are no longer being updated and are queried rarely. The information still needs to be searchable, but it's okay if those queries are extremely slow.`,
  });

export const COLD_PATTERN_TOOLTIP = ({ indices, pattern }: { indices: number; pattern: string }) =>
  i18n.translate('securitySolutionPackages.ecsDataQualityDashboard.coldPatternTooltip', {
    values: { indices, pattern },
    defaultMessage:
      '{indices} {indices, plural, =1 {index} other {indices}} matching the {pattern} pattern {indices, plural, =1 {is} other {are}} cold. Cold indices are no longer being updated and are queried infrequently. The information still needs to be searchable, but it’s okay if those queries are slower.',
  });
