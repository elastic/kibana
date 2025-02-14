/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EntityEcs } from '@kbn/securitysolution-ecs/src/entity';
import { FlyoutBody } from '../../shared/components/flyout_body';

interface UniversalEntityFlyoutContentProps {
  entity: EntityEcs;
}

export const UniversalEntityFlyoutContent = ({ entity }: UniversalEntityFlyoutContentProps) => {
  return <FlyoutBody>{entity.type}</FlyoutBody>;
};
