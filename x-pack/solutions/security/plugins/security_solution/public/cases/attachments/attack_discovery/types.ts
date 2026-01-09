/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExternalReferenceAttachmentViewProps } from '@kbn/cases-plugin/public/client/attachment_framework/types';

export interface AttackDiscoveryAttachmentMetadata {
    attackDiscoveryAlertId: string;
    index: string;
    generationUuid: string;
    title: string;
    timestamp: string;
}

export interface IAttackDiscoveryAttachmentProps extends ExternalReferenceAttachmentViewProps {
    externalReferenceMetadata: AttackDiscoveryAttachmentMetadata | null;
}




