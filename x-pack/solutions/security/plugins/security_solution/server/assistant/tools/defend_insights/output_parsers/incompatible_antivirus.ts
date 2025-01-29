/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StructuredOutputParser } from 'langchain/output_parsers';

import { z } from '@kbn/zod';

export function getIncompatibleVirusOutputParser() {
  return StructuredOutputParser.fromZodSchema(
    z.array(
      z.object({
        group: z.string().describe('The program which is triggering the events'),
        events: z
          .object({
            id: z.string().describe('The event ID'),
            endpointId: z.string().describe('The endpoint ID'),
            value: z.string().describe('The process.executable value of the event'),
          })
          .array()
          .describe('The events that the insight is based on'),
      })
    )
  );
}
