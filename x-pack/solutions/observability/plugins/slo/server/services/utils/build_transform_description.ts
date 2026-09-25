/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SLODefinition } from '../../domain/models';

export const MAX_TRANSFORM_DESCRIPTION_LENGTH = 1000;

/**
 * Builds a transform description, truncating the SLO name so the result fits
 * Elasticsearch's transform description limit.
 */
export const buildTransformDescription = (
  prefix: string,
  { id, name, revision }: Pick<SLODefinition, 'id' | 'name' | 'revision'>,
  terminator: string = ''
): string => {
  const suffix = ` [id: ${id}, revision: ${revision}]${terminator}`;
  const maxNameLength = MAX_TRANSFORM_DESCRIPTION_LENGTH - prefix.length - suffix.length;
  return `${prefix}${name.slice(0, maxNameLength)}${suffix}`;
};
