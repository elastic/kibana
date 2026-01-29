/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { ScriptTagKey } from '../../../../../../common/endpoint/service/scripts_library/constants';
import { SCRIPT_TAGS } from '../../../../../../common/endpoint/service/scripts_library/constants';

interface ScriptTagsProps {
  tags?: string[];
  'data-test-subj'?: string;
}

export const ScriptTags = memo<ScriptTagsProps>(({ tags, 'data-test-subj': dataTestSubj }) => {
  if (!tags || tags.length === 0) {
    return null;
  }

  return (
    <EuiFlexGroup gutterSize="s" data-test-subj={dataTestSubj} wrap>
      {tags.sort().map((tag) => (
        <EuiFlexItem grow={false} key={tag}>
          <EuiBadge key={tag} color="hollow">
            {SCRIPT_TAGS[tag as ScriptTagKey] || tag}
          </EuiBadge>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
});

ScriptTags.displayName = 'ScriptTags';
