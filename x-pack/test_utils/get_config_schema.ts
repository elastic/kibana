/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';

export async function getConfigSchema(pluginProvider: any): Promise<Joi.Schema> {
  class Plugin {
    constructor(public readonly options: any) {}
  }

  const plugin = pluginProvider({ Plugin });

  return await plugin.options.config(Joi);
}
