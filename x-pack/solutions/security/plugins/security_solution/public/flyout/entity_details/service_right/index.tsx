/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FlyoutPanelProps } from '@kbn/expandable-flyout';

interface ServicePanelProps extends Record<string, unknown> {
  contextID: string;
  scopeId: string;
  entityId: string;
  serviceName: string;
  isPreviewMode?: boolean;
}

export interface ServicePanelExpandableFlyoutProps extends FlyoutPanelProps {
  key: 'service-panel';
  params: ServicePanelProps;
}
