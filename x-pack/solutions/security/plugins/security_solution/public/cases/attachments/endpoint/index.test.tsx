/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UnifiedReferenceAttachmentViewProps } from '@kbn/cases-plugin/public/client/attachment_framework/types';
import { SECURITY_ENDPOINT_ATTACHMENT_TYPE } from '@kbn/cases-plugin/common';
import { EndpointAttachmentPayloadSchema } from '../../../../common/cases/attachments/endpoint';
import type { EndpointMetadata } from './types';
import { getEndpointUnifiedAttachment } from '.';
import { ENDPOINT_DISPLAY_NAME } from './translations';

type Props = UnifiedReferenceAttachmentViewProps<EndpointMetadata>;

const propsFor = (command: 'isolate' | 'unisolate'): Props =>
  ({
    metadata: {
      command,
      targets: [{ endpointId: 'endpoint-1', hostname: 'host-1', agentType: 'endpoint' }],
    },
  } as Props);

describe('endpoint case attachment icon', () => {
  const attachment = getEndpointUnifiedAttachment();

  it('registers the endpoint attachment', () => {
    expect(attachment.id).toBe(SECURITY_ENDPOINT_ATTACHMENT_TYPE);
    expect(attachment.schema).toBe(EndpointAttachmentPayloadSchema);
    expect(attachment.getLabel()).toBe(ENDPOINT_DISPLAY_NAME);
  });

  it('uses a lock icon when the command is isolate', () => {
    expect(attachment.getIcon(propsFor('isolate'))).toBe('lock');
  });

  it('uses a lock-open icon when the command is release', () => {
    expect(attachment.getIcon(propsFor('unisolate'))).toBe('lockOpen');
  });
});
