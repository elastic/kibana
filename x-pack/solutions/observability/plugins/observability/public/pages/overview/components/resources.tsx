/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGrid, EuiFlexItem, EuiListGroup, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

export function Resources() {
  return (
    <EuiFlexGrid direction="row">
      <EuiFlexItem grow={false}>
        <EuiTitle size="xs">
          <h4>
            {i18n.translate('xpack.observability.resources.title', {
              defaultMessage: 'Resources',
            })}
          </h4>
        </EuiTitle>
      </EuiFlexItem>
      <EuiListGroup flush listItems={resources} data-test-subj="listGroup" size="s" />
    </EuiFlexGrid>
  );
}

const resources = [
  {
    iconType: 'documents',
    label: i18n.translate('xpack.observability.resources.documentation', {
      defaultMessage: 'Documentation',
    }),
    href: 'https://ela.st/observability-documentation',
  },
  {
    iconType: 'editorComment',
    label: i18n.translate('xpack.observability.resources.forum', {
      defaultMessage: 'Discuss Forum',
    }),
    href: 'https://ela.st/observability-discuss',
  },
  {
    iconType: 'play',
    label: i18n.translate('xpack.observability.resources.quick_start', {
      defaultMessage: 'Quick Start Videos',
    }),
    href: 'https://ela.st/observability-quick-starts',
  },
  {
    iconType: 'training',
    label: i18n.translate('xpack.observability.resources.training', {
      defaultMessage: 'Free Observability Course',
    }),
    href: 'https://ela.st/observability-training',
  },
];
