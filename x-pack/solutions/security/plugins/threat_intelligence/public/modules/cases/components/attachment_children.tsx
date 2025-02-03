/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ExternalReferenceAttachmentViewProps } from '@kbn/cases-plugin/public/client/attachment_framework/types';
import { AttachmentMetadata } from '../utils/attachments';
import { CommentChildren } from './comment_children';

/**
 * Component lazy loaded when creating a new attachment type that will be registered
 * as an external reference.
 * The component is then shown in the Cases view.
 * It renders some text and a flyout.
 */
export const initComponent = () => {
  return (props: ExternalReferenceAttachmentViewProps) => {
    const indicatorId: string = props.externalReferenceId;
    const metadata = props.externalReferenceMetadata as unknown as AttachmentMetadata;

    return <CommentChildren id={indicatorId} metadata={metadata} />;
  };
};

// Note: This is for lazy loading
// eslint-disable-next-line import/no-default-export
export default initComponent();
