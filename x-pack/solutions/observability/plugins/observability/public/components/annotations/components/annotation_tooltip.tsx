/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPanel,
  EuiDescriptionList,
} from '@elastic/eui';
import { TagsList } from '@kbn/observability-shared-plugin/public';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { TimestampRangeLabel } from './timestamp_range_label';
import { Annotation, CreateAnnotationParams } from '../../../../common/annotations';
import { AnnotationIcon } from './annotation_icon';

export function AnnotationTooltip({
  annotation,
}: {
  annotation: Annotation | CreateAnnotationParams;
}) {
  const listItems = [
    {
      title: i18n.translate('xpack.observability.annotationTooltip.title', {
        defaultMessage: 'Title',
      }),
      description: annotation.annotation.title ?? '--',
    },
    {
      title: i18n.translate('xpack.observability.annotationTooltip.tags', {
        defaultMessage: 'Tags',
      }),
      description: <TagsList tags={annotation.tags} />,
    },
    {
      title: i18n.translate('xpack.observability.annotationTooltip.description', {
        defaultMessage: 'Description',
      }),
      description: annotation.message ?? '--',
    },
  ];

  if (annotation.slo?.id) {
    listItems.push({
      title: i18n.translate('xpack.observability.annotationTooltip.slo', {
        defaultMessage: 'SLO',
      }),
      description: annotation.slo?.id,
    });
  }

  if (annotation.service) {
    listItems.push({
      title: i18n.translate('xpack.observability.annotationTooltip.service', {
        defaultMessage: 'Service',
      }),
      description: annotation.service.name ?? '--',
    });
  }

  return (
    <EuiPanel color="plain" hasShadow={false} hasBorder={false} paddingSize="m" borderRadius="none">
      <EuiFlexGroup gutterSize="xs">
        <EuiFlexItem grow={false}>
          <AnnotationIcon annotation={annotation} />
        </EuiFlexItem>
        <EuiFlexItem>
          <TimestampRangeLabel annotation={annotation} />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiHorizontalRule margin="xs" />
      <EuiDescriptionList
        compressed
        listItems={listItems}
        type="column"
        columnWidths={[1, 3]} // Same as [25, 75]
        style={{ maxInlineSize: '400px' }}
      />
    </EuiPanel>
  );
}
