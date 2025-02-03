/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { UniversalEntityEcs } from '@kbn/securitysolution-ecs/src/universal_entity';
import { FlyoutBody } from '../../shared/components/flyout_body';

export const OBSERVED_SERVICE_QUERY_ID = 'observedServiceDetailsQuery';

interface UniversalEntityFlyoutContentProps {
  entity: UniversalEntityEcs;
}

export const UniversalEntityFlyoutContent = ({ entity }: UniversalEntityFlyoutContentProps) => {
  return <FlyoutBody>{entity.type}</FlyoutBody>;
};
