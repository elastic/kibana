/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiBadgeGroup, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export const AutomationTags = ({ tags }: { tags: string[] }) => (
  <EuiToolTip
    content={
      <EuiBadgeGroup gutterSize="xs">
        {tags.map((tag) => (
          <EuiBadge key={tag} color="hollow">
            {tag}
          </EuiBadge>
        ))}
      </EuiBadgeGroup>
    }
  >
    <EuiBadge
      color="hollow"
      iconType="tag"
      tabIndex={0}
      aria-label={i18n.translate('xpack.nightshift.automations.tagsCount', {
        defaultMessage: '{count} tags',
        values: { count: tags.length },
      })}
      data-test-subj="automationTags"
    >
      {tags.length}
    </EuiBadge>
  </EuiToolTip>
);
