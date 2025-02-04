/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiPanel, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  StreamGetResponse,
  isDslLifecycle,
  isIlmLifecycle,
  isInheritLifecycle,
  isRoot,
  isUnWiredStreamGetResponse,
} from '@kbn/streams-schema';

export function RetentionSummary({ definition }: { definition: StreamGetResponse }) {
  const summary = useMemo(() => summaryText(definition), [definition]);

  return (
    <EuiPanel hasShadow={false} hasBorder color="subdued" paddingSize="s">
      <EuiText>
        <h5>
          {i18n.translate('xpack.streams.streamDetailLifecycle.retentionSummaryLabel', {
            defaultMessage: 'Retention summary',
          })}
        </h5>
        {summary}
      </EuiText>
    </EuiPanel>
  );
}

function summaryText(definition: StreamGetResponse) {
  const lifecycle = definition.stream.ingest.lifecycle;

  if (isInheritLifecycle(lifecycle)) {
    return (
      <p>
        {i18n.translate('xpack.streams.streamDetailLifecycle.inheritLifecycleNote', {
          defaultMessage: 'This data stream is inheriting its lifecycle configuration.',
        })}
      </p>
    );
  } else if (isDslLifecycle(lifecycle)) {
    const usingDsl =
      isRoot(definition.stream.name) || isUnWiredStreamGetResponse(definition)
        ? i18n.translate('xpack.streams.streamDetailLifecycle.dslLifecycleRootNote', {
            defaultMessage: 'This data stream is using a custom data retention.',
          })
        : i18n.translate('xpack.streams.streamDetailLifecycle.dslLifecycleNonRootNote', {
            defaultMessage:
              'This data stream is using a custom data retention as an override at this level.',
          });
    return <p>{usingDsl}</p>;
  } else if (isIlmLifecycle(lifecycle)) {
    const usingIlm =
      isRoot(definition.stream.name) || isUnWiredStreamGetResponse(definition)
        ? i18n.translate('xpack.streams.streamDetailLifecycle.ilmPolicyRootNote', {
            defaultMessage: 'This data stream is using an ILM policy.',
          })
        : i18n.translate('xpack.streams.streamDetailLifecycle.ilmPolicyNonRootNote', {
            defaultMessage: 'This data stream is using an ILM policy as an override at this level.',
          });
    return <p>{usingIlm}</p>;
  }

  return (
    <p>
      {i18n.translate('xpack.streams.streamDetailLifecycle.disabledPolicyNote', {
        defaultMessage: 'The retention for this data stream is disabled.',
      })}
    </p>
  );
}
