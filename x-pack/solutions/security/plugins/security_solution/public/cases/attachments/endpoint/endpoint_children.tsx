/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { css } from '@emotion/react';
import type { EuiThemeComputed } from '@elastic/eui';
import { EuiMarkdownFormat, useEuiTheme } from '@elastic/eui';
import type { UnifiedReferenceAttachmentViewProps } from '@kbn/cases-plugin/public/client/attachment_framework/types';
import type { EndpointMetadata } from './types';

export const getContentWrapperCss = (euiTheme: EuiThemeComputed<{}>) => css`
  padding: ${`${euiTheme.size.m} ${euiTheme.size.l}`};
  text-overflow: ellipsis;
  word-break: break-word;
  display: -webkit-box;
  -webkit-box-orient: vertical;
`;

type Props = Pick<UnifiedReferenceAttachmentViewProps, 'metadata'>;

const AttachmentContentChildren = ({ metadata }: Props) => {
  const { euiTheme } = useEuiTheme();
  const endpointMetadata = metadata as EndpointMetadata | undefined;
  const comment = endpointMetadata?.comment ?? '';

  return comment.trim().length > 0 ? (
    <div css={getContentWrapperCss(euiTheme)}>
      <EuiMarkdownFormat grow={true}>{comment}</EuiMarkdownFormat>
    </div>
  ) : null;
};
// eslint-disable-next-line import/no-default-export
export { AttachmentContentChildren as default };
