/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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

/** Legacy props shape (externalReference registry) */
export interface IExternalReferenceMetaDataProps {
  externalReferenceMetadata: EndpointMetadata;
}

/** Props with metadata field (unified registry or any record-based metadata) */
interface MetadataProps {
  metadata?: Record<string, unknown> | null;
  [key: string]: unknown;
}

/** Combined props — components accept either legacy or unified format */
export type EndpointAttachmentProps = IExternalReferenceMetaDataProps | MetadataProps;

/**
 * Extracts endpoint metadata from either legacy or unified props.
 */
export const getEndpointMetadata = (
  props: EndpointAttachmentProps
): EndpointMetadata | undefined => {
  if ('externalReferenceMetadata' in props) {
    return (props as IExternalReferenceMetaDataProps).externalReferenceMetadata;
  }
  const { metadata } = props as MetadataProps;
  if (metadata) {
    return metadata as unknown as EndpointMetadata;
  }
  return undefined;
};
