/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiBadgeProps } from '@elastic/eui';
import { EuiBadge, EuiToolTip } from '@elastic/eui';
import type { KnowledgeIndicator } from '@kbn/nightshift-ai';
import React from 'react';
import { getKnowledgeIndicatorSourceIds } from '../utils/get_knowledge_indicator_source_id';

interface Props {
  knowledgeIndicator: KnowledgeIndicator;
  sourceId: string;
  getSourceTitle: (sourceId: string) => string;
  iconType?: EuiBadgeProps['iconType'];
}

export const KnowledgeIndicatorSourceBadge = ({
  knowledgeIndicator,
  sourceId,
  getSourceTitle,
  iconType,
}: Props): React.ReactElement => {
  const sourceTitle = getSourceTitle(sourceId);
  const otherSourceTitles = getKnowledgeIndicatorSourceIds(knowledgeIndicator)
    .filter((id) => id !== sourceId)
    .map(getSourceTitle);
  const badge = (
    <EuiBadge
      color="hollow"
      iconType={iconType}
      iconSide={iconType ? 'left' : undefined}
      tabIndex={otherSourceTitles.length > 0 ? 0 : undefined}
    >
      {otherSourceTitles.length > 0 ? `${sourceTitle} +${otherSourceTitles.length}` : sourceTitle}
    </EuiBadge>
  );

  return otherSourceTitles.length > 0 ? (
    <EuiToolTip content={[sourceTitle, ...otherSourceTitles].join(', ')}>{badge}</EuiToolTip>
  ) : (
    badge
  );
};
