/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UnifiedReferenceAttachmentViewProps } from '@kbn/cases-plugin/public/client/attachment_framework/types';
import { SECURITY_ENDPOINT_ATTACHMENT_TYPE } from '@kbn/cases-plugin/common';
import { EndpointAttachmentPayloadSchema } from '../../../../common/cases/attachments/endpoint';
import { getEndpointUnifiedAttachment } from '.';
import { ENDPOINT_DISPLAY_NAME } from './translations';
import type { EndpointMetadata } from './types';

const baseProps = {
  caseData: { id: 'case-1', title: 'Case 1' },
  attachmentId: 'action-1',
  metadata: {
    command: 'isolate',
    targets: [{ endpointId: 'endpoint-1', hostname: 'host-1', agentType: 'endpoint' }],
  },
} as unknown as UnifiedReferenceAttachmentViewProps<EndpointMetadata>;

describe('Endpoint attachment', () => {
  it('uses a lock icon for isolate and lockOpen for release', () => {
    const attachment = getEndpointUnifiedAttachment();

    expect(attachment.id).toBe(SECURITY_ENDPOINT_ATTACHMENT_TYPE);
    expect(attachment.schema).toBe(EndpointAttachmentPayloadSchema);
    expect(attachment.getLabel()).toBe(ENDPOINT_DISPLAY_NAME);
    expect(attachment.getIcon(baseProps)).toBe('lock');
    expect(
      attachment.getIcon({
        ...baseProps,
        metadata: {
          ...baseProps.metadata,
          command: 'unisolate',
        },
      })
    ).toBe('lockOpen');
  });
});
