/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';

// Use Function constructor to prevent babel from translating import() to require()
// eslint-disable-next-line no-new-func
const dynamicImport = new Function('path', 'return import(path);');

const inputSchema = z.object({
  data: z.any().describe('Any object to encode in toon format'),
});

const outputSchema = z.object({
  toon: z.string().describe('The toon-encoded representation of the input data'),
  message: z.string(),
});

export const toonEncodeStepDefinition = createServerStepDefinition({
  id: 'security.toonEncode',
  inputSchema,
  outputSchema,
  handler: async (context) => {
    try {
      const { encode } = await dynamicImport('@toon-format/toon');
      const { data } = context.input;
      const toon = encode(data);

      return {
        output: {
          toon,
          message: 'Successfully encoded data to toon format.',
        },
      };
    } catch (error) {
      context.logger.error('Failed to encode data to toon format', error);
      return {
        error: new Error(
          error instanceof Error ? error.message : 'Failed to encode data to toon format'
        ),
      };
    }
  },
});

