/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { z } from '@kbn/zod/v4';
import type { PublicStepDefinition } from '@kbn/workflows-extensions/public';
import { i18n } from '@kbn/i18n';

const inputSchema = z.object({
  data: z.any().describe('Any object to encode in toon format'),
});

const outputSchema = z.object({
  toon: z.string().describe('The toon-encoded representation of the input data'),
  message: z.string(),
});

export const toonEncodeStepDefinition: PublicStepDefinition = {
  id: 'security.toonEncode',
  inputSchema,
  outputSchema,
  label: i18n.translate('securitySolution.workflows.steps.toonEncode.label', {
    defaultMessage: 'Toon Encode',
  }),
  description: i18n.translate('securitySolution.workflows.steps.toonEncode.description', {
    defaultMessage: 'Encode any object to toon format representation',
  }),
  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/code').then(({ icon }) => ({ default: icon })).catch(() =>
      import('@elastic/eui/es/components/icon/assets/document').then(({ icon }) => ({ default: icon }))
    )
  ),
  documentation: {
    details: i18n.translate('securitySolution.workflows.steps.toonEncode.documentation.details', {
      defaultMessage: 'Encodes any object into the toon format, a compact text representation that preserves structure and data.',
    }),
    examples: [
      `## Encode data to toon format
\`\`\`yaml
- name: encode_to_toon
  type: security.toonEncode
  with:
    data:
      users:
        - id: 1
          name: Alice
          role: admin
        - id: 2
          name: Bob
          role: user
\`\`\``,
    ],
  },
};

