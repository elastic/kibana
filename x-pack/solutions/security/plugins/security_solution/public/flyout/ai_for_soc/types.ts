/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FlyoutPanelProps } from '@kbn/expandable-flyout';
import type { IOCPanelKey } from './constants/panel_keys';

export interface AIForSOCDetailsProps extends FlyoutPanelProps {
  key: typeof IOCPanelKey;
  params?: {
    id: string;
    indexName: string;
  };
}
