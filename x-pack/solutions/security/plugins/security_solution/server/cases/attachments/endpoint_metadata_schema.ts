/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { isLeft } from 'fp-ts/Either';

const EndpointAttachmentMetadataRt = rt.type({
  command: rt.string,
  comment: rt.string,
  targets: rt.array(
    rt.type({
      endpointId: rt.string,
      hostname: rt.string,
      agentType: rt.string,
    })
  ),
});

export const validateEndpointAttachmentMetadata = (data: unknown): void => {
  const result = EndpointAttachmentMetadataRt.decode(data);
  if (isLeft(result)) {
    throw new Error(
      `Invalid endpoint attachment metadata: expected { command: string, comment: string, targets: Array<{ endpointId: string, hostname: string, agentType: string }> }`
    );
  }
};
