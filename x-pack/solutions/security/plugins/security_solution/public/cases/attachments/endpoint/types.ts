/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UnifiedReferenceAttachmentViewProps } from '@kbn/cases-plugin/public/client/attachment_framework/types';
import type { ResponseActionAgentType } from '../../../../common/endpoint/service/response_actions/constants';

export interface EndpointMetadata {
  comment: string;
  command: string;
  targets: Array<{
    endpointId: string;
    hostname: string;
    agentType: ResponseActionAgentType;
  }>;
}

/**
 * Props accepted by the endpoint attachment renderers.
 *
 * The legacy `externalReference` registration has been removed (endpoint is
 * registered as a unified attachment), so renderers now accept only the
 * unified shape. We slice `UnifiedReferenceAttachmentViewProps` down to
 * `metadata` to keep the renderers decoupled from unrelated view props
 * (savedObjectId, caseData, rowContext, …) while still being structurally
 * compatible with the unified registry's view props contract.
 */
export type EndpointAttachmentProps = Pick<UnifiedReferenceAttachmentViewProps, 'metadata'>;

/**
 * Extracts endpoint metadata from unified props.
 */
export const getEndpointMetadata = (
  props: EndpointAttachmentProps
): EndpointMetadata | undefined => {
  return props.metadata ? (props.metadata as unknown as EndpointMetadata) : undefined;
};
