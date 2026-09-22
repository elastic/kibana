/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { PopoverItems } from '../../../../../common/components/popover_items';

export interface TagsBadgeProps {
  /**
   * An array of string tags associated with the attack document.
   * If undefined or empty, the component renders nothing.
   */
  tags?: string[];
}

/**
 * A badge component that displays the number of tags assigned to an attack.
 * When clicked, it reveals a popover containing the full list of tags.
 * Designed to be used within the attack group row of the Attacks table.
 */
export const TagsBadge = React.memo<TagsBadgeProps>(({ tags }) => {
  if (!tags || tags.length === 0) {
    return null;
  }

  return (
    <PopoverItems
      items={tags}
      popoverTitle={i18n.translate(
        'xpack.securitySolution.detectionEngine.attacks.tableSection.tagsTooltipTitle',
        {
          defaultMessage: 'Tags',
        }
      )}
      popoverButtonTitle={tags.length.toString()}
      popoverButtonIcon="tag"
      dataTestPrefix="attack-tags-badge"
      renderItem={(tag: string, i: number) => (
        <EuiBadge color="hollow" key={`${tag}-${i}`}>
          {tag}
        </EuiBadge>
      )}
    />
  );
});

TagsBadge.displayName = 'TagsBadge';
