/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/* eslint-disable max-classes-per-file*/

import { type ErrorObject, type ValidateFunction } from 'ajv';
import type { ToolHandlerContext } from '@kbn/onechat-server';

import type { PathDefinition, PathRegistry } from './types';
import { Path } from './path';

export class PathArgsValidationError extends Error {
  constructor(public readonly errors: ErrorObject[]) {
    super('Path arguments are invalid');
  }
}

export class PathToolClient {
  private readonly pathRegistry: PathRegistry = new Map();
  private readonly validators: Map<string, ValidateFunction> = new Map();

  constructor() {}

  registerPath = (definition: PathDefinition) => {
    this.pathRegistry.set(definition.name, definition);
  };

  validate(name: string, parameters: unknown) {
    const validator = this.validators.get(name)!;
    if (!validator) {
      return;
    }

    const result = validator(parameters);
    if (!result) {
      throw new PathArgsValidationError(validator.errors!);
    }
  }

  getPaths() {
    const allPaths = Array.from(this.pathRegistry.values());

    return allPaths;
  }

  async executePath(
    name: string,
    options: { prompt: string; toolHandlerContext: ToolHandlerContext }
  ) {
    const { logger, modelProvider } = options.toolHandlerContext;
    const path = this.pathRegistry.get(name);
    const model = await modelProvider.getDefaultModel();
    if (!path) {
      throw new Error(`Path ${name} not found`);
    }
    try {
      const steps = new Path(path);
      return await steps.walk(model, options.prompt, options.toolHandlerContext);
    } catch (e) {
      logger.error(`Error executing path "${name}": ${e.message}`);
      logger.error(e);
      throw e;
    }
  }
}
