/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { getEcsField } from '../../../flyout/document_details/right/components/table_field_name_cell';
import { IP_FIELD_TYPE } from '../../../timelines/components/timeline/body/renderers/constants';
import { FlowTargetSourceDest } from '../../../../common/search_strategy/security_solution/network';
import { Network } from '../../network_details';

/**
 * Returns the React element to render inside the system flyout for the given field/value,
 * or null if the field type is not supported.
 *
 * Currently supports:
 * - IP fields → Network details flyout
 */
export const buildFlyoutContent = (field: string, value: string): React.ReactElement | null => {
  const ecsField = getEcsField(field);

  if (ecsField?.type === IP_FIELD_TYPE) {
    const flowTarget = field.includes(FlowTargetSourceDest.destination)
      ? FlowTargetSourceDest.destination
      : FlowTargetSourceDest.source;

    return <Network ip={value} flowTarget={flowTarget} />;
  }

  return null;
};
