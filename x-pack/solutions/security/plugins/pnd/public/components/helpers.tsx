/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type IconType, type EuiButtonEmptyProps } from '@elastic/eui';
import type { RecommendedAction } from '@kbn/pnd-common';

export const getEmptyValue = () => '—';

const ACTION_ICONS_MAP: Record<RecommendedAction, IconType> = {
  contain: 'lock',
  escalate: 'lock',
  investigate: 'external',
  tune: 'gear',
};

export const getActionButtonIconProps = ({
  recommendedAction,
  severity,
}: {
  recommendedAction?: RecommendedAction;
  severity?: string;
}): {
  color: EuiButtonEmptyProps['color'];
  type: IconType;
} => {
  if (recommendedAction == null) {
    return { color: 'warning', type: 'flag' };
  }

  if (recommendedAction === 'contain' && severity === 'high') {
    return { color: 'danger', type: 'cross' };
  }

  return {
    color: ['investigate', 'tune'].includes(recommendedAction) ? 'primary' : 'danger',
    type: ACTION_ICONS_MAP[recommendedAction],
  };
};
