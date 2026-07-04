/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiHealth,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { Feature } from '@kbn/streams-schema';

const CONFIDENCE_LABEL = i18n.translate('xpack.observability.nightshift.kiFlyout.confidence', {
  defaultMessage: 'Confidence',
});
const TYPE_LABEL = i18n.translate('xpack.observability.nightshift.kiFlyout.type', {
  defaultMessage: 'Type',
});
const SUBTYPE_LABEL = i18n.translate('xpack.observability.nightshift.kiFlyout.subtype', {
  defaultMessage: 'Sub-type',
});
const TAGS_LABEL = i18n.translate('xpack.observability.nightshift.kiFlyout.tags', {
  defaultMessage: 'Tags',
});
const STREAMS_LABEL = i18n.translate('xpack.observability.nightshift.kiFlyout.streams', {
  defaultMessage: 'Streams',
});
const DESCRIPTION_LABEL = i18n.translate('xpack.observability.nightshift.kiFlyout.description', {
  defaultMessage: 'Description',
});

function confidenceColor(confidence: number): 'success' | 'warning' | 'danger' {
  if (confidence >= 70) return 'success';
  if (confidence >= 40) return 'warning';
  return 'danger';
}

export interface KiDetailFlyoutProps {
  feature: Feature;
  onClose: () => void;
}

export function KiDetailFlyout({ feature, onClose }: KiDetailFlyoutProps) {
  const flyoutTitleId = useGeneratedHtmlId({ prefix: 'kiDetailFlyout' });

  return (
    <EuiFlyout onClose={onClose} aria-labelledby={flyoutTitleId} size="s" type="overlay">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2 id={flyoutTitleId}>{feature.title ?? feature.id}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiFlexGroup gutterSize="l" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              {CONFIDENCE_LABEL}
            </EuiText>
            <EuiHealth color={confidenceColor(feature.confidence)}>{feature.confidence}</EuiHealth>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              {TYPE_LABEL}
            </EuiText>
            <EuiBadge color="hollow">{feature.type}</EuiBadge>
          </EuiFlexItem>
          {feature.subtype && (
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                {SUBTYPE_LABEL}
              </EuiText>
              <EuiBadge color="hollow">{feature.subtype}</EuiBadge>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>

        {feature.tags && feature.tags.length > 0 && (
          <>
            <EuiSpacer size="m" />
            <EuiText size="xs" color="subdued">
              {TAGS_LABEL}
            </EuiText>
            <EuiSpacer size="xs" />
            <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
              {feature.tags.map((tag) => (
                <EuiFlexItem grow={false} key={tag}>
                  <EuiBadge color="hollow">{tag}</EuiBadge>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          </>
        )}

        <EuiSpacer size="m" />
        <EuiText size="xs" color="subdued">
          {STREAMS_LABEL}
        </EuiText>
        <EuiSpacer size="xs" />
        <EuiBadge color="hollow" iconType="documents">
          {feature.stream_name}
        </EuiBadge>

        <EuiSpacer size="m" />
        <EuiTitle size="xxs">
          <h4>{DESCRIPTION_LABEL}</h4>
        </EuiTitle>
        <EuiSpacer size="xs" />
        <EuiText size="s">
          <p>{feature.description}</p>
        </EuiText>
      </EuiFlyoutBody>
    </EuiFlyout>
  );
}
