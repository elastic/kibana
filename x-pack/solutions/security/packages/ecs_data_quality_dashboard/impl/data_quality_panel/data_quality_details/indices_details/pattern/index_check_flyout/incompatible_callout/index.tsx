/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EcsVersion } from '@elastic/ecs';

import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import React from 'react';

import {
  DETECTION_ENGINE_RULES_MAY_NOT_MATCH,
  INCOMPATIBLE_CALLOUT,
  INCOMPATIBLE_CALLOUT_TITLE,
  MAPPINGS_THAT_CONFLICT_WITH_ECS,
  PAGES_MAY_NOT_DISPLAY_EVENTS,
} from '../../../../../translations';
import { calloutItemCss } from '../styles';

export interface Props {
  incompatibleFieldCount?: number;
  ecsVersion?: string;
}

const IncompatibleCalloutComponent: React.FC<Props> = ({
  ecsVersion = EcsVersion,
  incompatibleFieldCount,
}) => {
  return (
    <EuiCallOut
      color="danger"
      data-test-subj="incompatibleCallout"
      size="s"
      title={
        incompatibleFieldCount != null
          ? INCOMPATIBLE_CALLOUT_TITLE(incompatibleFieldCount)
          : undefined
      }
    >
      <div data-test-subj="fieldsAreIncompatible">{INCOMPATIBLE_CALLOUT(ecsVersion)}</div>
      <EuiSpacer size="xs" />
      <div css={calloutItemCss} data-test-subj="rulesMayNotMatch">
        {DETECTION_ENGINE_RULES_MAY_NOT_MATCH}
      </div>
      <div css={calloutItemCss} data-test-subj="pagesMayNotDisplayEvents">
        {PAGES_MAY_NOT_DISPLAY_EVENTS}
      </div>
      <div css={calloutItemCss} data-test-subj="mappingsThatDontComply">
        {MAPPINGS_THAT_CONFLICT_WITH_ECS}
      </div>
    </EuiCallOut>
  );
};

IncompatibleCalloutComponent.displayName = 'IncompatibleCalloutComponent';

export const IncompatibleCallout = React.memo(IncompatibleCalloutComponent);
