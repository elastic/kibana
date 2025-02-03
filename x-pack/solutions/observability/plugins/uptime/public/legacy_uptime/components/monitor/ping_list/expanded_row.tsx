/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiTitle, formatNumber } from '@elastic/eui';
import {
  EuiCallOut,
  EuiCodeBlock,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { Ping, HttpResponseBody } from '../../../../../common/runtime_types';
import { DocLinkForBody } from './doc_link_body';
import { PingRedirects } from './ping_redirects';
import { PingHeaders } from './headers';

interface Props {
  ping: Ping;
}

const BodyDescription = ({ body }: { body: HttpResponseBody }) => {
  const contentBytes = body.content_bytes || 0;
  const bodyBytes = body.bytes || 0;

  const truncatedText =
    contentBytes > 0 && contentBytes < bodyBytes
      ? i18n.translate('xpack.uptime.pingList.expandedRow.truncated', {
          defaultMessage: 'Showing first {contentBytes} bytes.',
          values: { contentBytes },
        })
      : null;
  const bodySizeText =
    bodyBytes > 0
      ? i18n.translate('xpack.uptime.pingList.expandedRow.bodySize', {
          defaultMessage: 'Body size is {bodyBytes}.',
          values: { bodyBytes: formatNumber(bodyBytes, '0b') },
        })
      : null;
  const combinedText = [truncatedText, bodySizeText].filter((s) => s).join(' ');

  return <EuiText>{combinedText}</EuiText>;
};

const BodyExcerpt = ({ content }: { content: string }) =>
  content ? <EuiCodeBlock overflowHeight={250}>{content}</EuiCodeBlock> : null;

export const PingListExpandedRowComponent = ({ ping }: Props) => (
  <EuiFlexGroup direction="column">
    {ping?.http?.response?.redirects && (
      <EuiFlexItem>
        <PingRedirects monitorStatus={ping} showTitle={true} />
      </EuiFlexItem>
    )}
    {ping?.http?.response?.headers && (
      <EuiFlexItem>
        <PingHeaders headers={ping?.http?.response?.headers} />
      </EuiFlexItem>
    )}
    <EuiFlexItem>
      <EuiCallOut color={ping?.error ? 'danger' : 'primary'}>
        {ping.http?.response?.body && (
          // Show the body, if present
          <>
            <EuiTitle size="xs">
              <h5>
                {i18n.translate('xpack.uptime.pingList.expandedRow.response_body', {
                  defaultMessage: 'Response Body',
                })}
              </h5>
            </EuiTitle>
            <BodyDescription body={ping.http.response.body} />
            <EuiSpacer size={'s'} />
            {ping.http.response.body.content ? (
              <BodyExcerpt content={ping.http.response.body.content || ''} />
            ) : (
              <DocLinkForBody />
            )}
          </>
        )}
        {ping.error && (
          // Show the error block
          <EuiDescriptionList
            listItems={[
              {
                title: i18n.translate('xpack.uptime.pingList.expandedRow.error', {
                  defaultMessage: 'Error',
                }),
                description: ping.error.message,
              },
            ]}
          />
        )}
      </EuiCallOut>
    </EuiFlexItem>
  </EuiFlexGroup>
);
