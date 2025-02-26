/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer, EuiText, EuiFlexItem, EuiFlexGroup, EuiBadge, useEuiTheme } from '@elastic/eui';
import React, { useMemo } from 'react';

import type { EntityEcs } from '@kbn/securitysolution-ecs/src/entity';
import { css } from '@emotion/react';
import { ExpandableBadgeGroup } from './components/expandable_badge_group';
import { HeaderDataCards } from './header_data_cards';
import { EntityIconByType } from '../../../entity_analytics/components/entity_store/helpers';
import { PreferenceFormattedDate } from '../../../common/components/formatted_date';
import { FlyoutHeader } from '../../shared/components/flyout_header';
import { FlyoutTitle } from '../../shared/components/flyout_title';

interface UniversalEntityFlyoutHeaderProps {
  entity: EntityEcs;
}

const HeaderTags = ({ entity }) => {
  const { euiTheme } = useEuiTheme();

  const tagBadges = useMemo(
    () => entity.tags?.map((tag) => <EuiBadge color="hollow">{tag}</EuiBadge>),
    [entity.tags]
  );

  const labelBadges = useMemo(
    () =>
      entity.labels &&
      Object.entries(entity.labels)?.map(([key, value]) => (
        <EuiBadge color="hollow">
          <span
            css={css`
              color: ${euiTheme.colors.disabledText};
              border-right: ${euiTheme.border.thick};
              padding-right: 4px;
            `}
          >
            {key}
          </span>
          <span
            css={css`
              padding-left: 4px;
            `}
          >
            {value}
          </span>
        </EuiBadge>
      )),
    [entity.labels, euiTheme.border.thick, euiTheme.colors.disabledText]
  );

  const allBadges = [...(tagBadges || []), ...(labelBadges || [])];

  return <ExpandableBadgeGroup badges={allBadges} initialBadgeLimit={3} maxHeight={180} />;
};

export const UniversalEntityFlyoutHeader = ({ entity }: UniversalEntityFlyoutHeaderProps) => {
  return (
    <>
      <FlyoutHeader data-test-subj="service-panel-header">
        <EuiFlexGroup gutterSize="s" responsive={false} direction="column">
          <EuiFlexItem grow={false}>
            <EuiText size="xs" data-test-subj={'service-panel-header-lastSeen'}>
              <PreferenceFormattedDate value={entity?.timestamp} />
              <EuiSpacer size="xs" />
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <FlyoutTitle
              title={entity?.name}
              iconType={EntityIconByType[entity?.type] || 'globe'}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </FlyoutHeader>
      <div style={{ margin: 8 }}>
        <HeaderDataCards entity={entity} />
      </div>
      <div style={{ margin: 8 }}>
        <HeaderTags entity={entity} />
      </div>
    </>
  );
};
