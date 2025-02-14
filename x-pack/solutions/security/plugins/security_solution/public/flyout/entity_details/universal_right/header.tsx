/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer, EuiText, EuiFlexItem, EuiFlexGroup } from '@elastic/eui';
import React from 'react';

import type { EntityEcs } from '@kbn/securitysolution-ecs/src/entity';
import { EntityIconByType } from '../../../entity_analytics/components/entity_store/helpers';
import { PreferenceFormattedDate } from '../../../common/components/formatted_date';
import { FlyoutHeader } from '../../shared/components/flyout_header';
import { FlyoutTitle } from '../../shared/components/flyout_title';

interface UniversalEntityFlyoutHeaderProps {
  entity: EntityEcs;
}

export const UniversalEntityFlyoutHeader = ({ entity }: UniversalEntityFlyoutHeaderProps) => {
  return (
    <FlyoutHeader data-test-subj="service-panel-header">
      <EuiFlexGroup gutterSize="s" responsive={false} direction="column">
        <EuiFlexItem grow={false}>
          <EuiText size="xs" data-test-subj={'service-panel-header-lastSeen'}>
            <PreferenceFormattedDate value={entity?.timestamp} />
            <EuiSpacer size="xs" />
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <FlyoutTitle title={entity?.id} iconType={EntityIconByType[entity?.type]} />
        </EuiFlexItem>
      </EuiFlexGroup>
    </FlyoutHeader>
  );
};
