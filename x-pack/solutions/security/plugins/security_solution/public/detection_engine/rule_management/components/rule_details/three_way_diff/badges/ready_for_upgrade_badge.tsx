/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiBadgeProps } from '@elastic/eui';
import { EuiBadge } from '@elastic/eui';
import * as i18n from './translations';

interface ReadyForUpgradeBadgeProps {
  color?: EuiBadgeProps['color'];
}

export function ReadyForUpgradeBadge({
  color = 'success',
}: ReadyForUpgradeBadgeProps): JSX.Element {
  return <EuiBadge color={color}>{i18n.READY_FOR_UPDATE}</EuiBadge>;
}
