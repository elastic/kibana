/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SameFamilyFieldMetadata, IncompatibleFieldMetadata } from '../../../types';
import {
  escapeNewlines,
  getIncompatibleMappings,
  getIncompatibleValues,
} from '../../../utils/markdown';

export const getEscapedIncompatibleMappingsFields = (
  incompatibleFields: IncompatibleFieldMetadata[]
): string[] =>
  getIncompatibleMappings(incompatibleFields).map((x) => escapeNewlines(x.indexFieldName));

export const getEscapedIncompatibleValuesFields = (
  incompatibleFields: IncompatibleFieldMetadata[]
): string[] =>
  getIncompatibleValues(incompatibleFields).map((x) => escapeNewlines(x.indexFieldName));

export const getEscapedSameFamilyFields = (sameFamilyFields: SameFamilyFieldMetadata[]): string[] =>
  sameFamilyFields.map((x) => escapeNewlines(x.indexFieldName));
