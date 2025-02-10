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
  IngestStreamGetResponse,
  isDslLifecycle,
  isIlmLifecycle,
  isInheritLifecycle,
  isRoot,
  isUnwiredStreamGetResponse,
} from '@kbn/streams-schema';

export function RetentionSummary({ definition }: { definition: IngestStreamGetResponse }) {
  const summary = useMemo(() => summaryText(definition), [definition]);

  return (
    <EuiPanel hasShadow={false} hasBorder color="subdued" paddingSize="s">
      <EuiText>
        <h5>
          {i18n.translate('xpack.streams.streamDetailLifecycle.retentionSummaryLabel', {
            defaultMessage: 'Retention summary',
          })}
        </h5>
        <p>{summary}</p>
      </EuiText>
    </EuiPanel>
  );
}

function summaryText(definition: IngestStreamGetResponse) {
  const lifecycle = definition.stream.ingest.lifecycle;

  if (isInheritLifecycle(lifecycle)) {
    return i18n.translate('xpack.streams.streamDetailLifecycle.inheritLifecycleNote', {
      defaultMessage: 'This data stream is inheriting its lifecycle configuration.',
    });
  } else if (isDslLifecycle(lifecycle)) {
    return isRoot(definition.stream.name) || isUnwiredStreamGetResponse(definition)
      ? i18n.translate('xpack.streams.streamDetailLifecycle.dslLifecycleRootNote', {
          defaultMessage: 'This data stream is using a custom data retention.',
        })
      : i18n.translate('xpack.streams.streamDetailLifecycle.dslLifecycleNonRootNote', {
          defaultMessage:
            'This data stream is using a custom data retention as an override at this level.',
        });
  } else if (isIlmLifecycle(lifecycle)) {
    return isRoot(definition.stream.name) || isUnwiredStreamGetResponse(definition)
      ? i18n.translate('xpack.streams.streamDetailLifecycle.ilmPolicyRootNote', {
          defaultMessage: 'This data stream is using an ILM policy.',
        })
      : i18n.translate('xpack.streams.streamDetailLifecycle.ilmPolicyNonRootNote', {
          defaultMessage: 'This data stream is using an ILM policy as an override at this level.',
        });
  }

  return i18n.translate('xpack.streams.streamDetailLifecycle.disabledPolicyNote', {
    defaultMessage: 'The retention for this data stream is disabled.',
  });
}
