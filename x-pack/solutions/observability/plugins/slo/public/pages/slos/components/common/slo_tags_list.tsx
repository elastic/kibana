/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { TagsList } from '@kbn/observability-shared-plugin/public';
import type { TagsListProps } from '@kbn/observability-shared-plugin/public';
import { useUrlSearchState } from '../../hooks/use_url_search_state';

export function SloTagsList(props: TagsListProps) {
  const { onStateChange } = useUrlSearchState();

  const onTagClick = useCallback(
    (tag: string) => {
      onStateChange({
        kqlQuery: `slo.tags: "${tag}"`,
      });
    },
    [onStateChange]
  );

  return <TagsList {...props} onClick={onTagClick} />;
}
