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
import type { EndpointData } from './types';

export const getContentWrapperCss = (euiTheme: EuiThemeComputed<{}>) => css`
  padding: ${`${euiTheme.size.m} ${euiTheme.size.l}`};
  text-overflow: ellipsis;
  word-break: break-word;
  display: -webkit-box;
  -webkit-box-orient: vertical;
`;

type Props = Pick<UnifiedReferenceAttachmentViewProps, 'data'>;

const AttachmentContentChildren = ({ data }: Props) => {
  const { euiTheme } = useEuiTheme();
  // `data` is typed as `unknown` on the framework prop; the cases server
  // attachment framework guarantees the shape because the unified
  // `security.endpoint` payload is validated against `EndpointAttachmentPayloadSchema`
  // (or projected from a legacy `actions` / `externalReference` shape via the
  // server-side transformers) before it reaches the renderer.
  const endpointData = data as EndpointData | undefined;
  const comment = endpointData?.content ?? '';

  return comment.trim().length > 0 ? (
    <div css={getContentWrapperCss(euiTheme)}>
      <EuiMarkdownFormat grow={true}>{comment}</EuiMarkdownFormat>
    </div>
  ) : null;
};
// eslint-disable-next-line import/no-default-export
export { AttachmentContentChildren as default };
