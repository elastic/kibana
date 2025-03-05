/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import type { IconType } from '@elastic/eui';
import { EuiSpacer, EuiText, EuiFlexItem, EuiFlexGroup, useEuiTheme } from '@elastic/eui';
import type { EntityEcs } from '@kbn/securitysolution-ecs/src/entity';
import type { EntityType } from '../../../../common/entity_analytics/types';
import { ExpandableBadgeGroup } from './components/expandable_badge_group';
import { HeaderDataCards } from './header_data_cards';
import { EntityIconByType } from '../../../entity_analytics/components/entity_store/helpers';
import { PreferenceFormattedDate } from '../../../common/components/formatted_date';
import { FlyoutHeader } from '../../shared/components/flyout_header';
import { FlyoutTitle } from '../../shared/components/flyout_title';

const initialBadgeLimit = 3;
const maxBadgeContainerHeight = 180;

const HeaderTags = ({ tags, labels }: { tags: EntityEcs['tags']; labels: EntityEcs['labels'] }) => {
  const { euiTheme } = useEuiTheme();

  const tagBadges = useMemo(
    () =>
      tags?.map((tag) => ({
        color: 'hollow',
        children: tag,
      })),
    [tags]
  );

  const labelBadges = useMemo(
    () =>
      labels &&
      Object.entries(labels)?.map(([key, value]) => ({
        color: 'hollow',
        children: (
          <>
            <span
              css={css`
                color: ${euiTheme.colors.disabledText};
                border-right: ${euiTheme.border.thick};
                padding-right: ${euiTheme.size.xs};
              `}
            >
              {key}
            </span>
            <span
              css={css`
                padding-left: ${euiTheme.size.xs};
              `}
            >
              {value}
            </span>
          </>
        ),
      })),
    [labels, euiTheme.colors.disabledText, euiTheme.border.thick, euiTheme.size.xs]
  );

  const allBadges = [...(tagBadges || []), ...(labelBadges || [])];

  return (
    <ExpandableBadgeGroup
      badges={allBadges}
      initialBadgeLimit={initialBadgeLimit}
      maxHeight={maxBadgeContainerHeight}
    />
  );
};

interface UniversalEntityFlyoutHeaderProps {
  entity: EntityEcs;
  timestamp?: Date;
}

// TODO: Asset Inventory - move this to a shared location, for now it's here as a mock since we dont have generic entities yet
enum GenericEntityType {
  container = 'container',
}

export const UniversalEntityIconByType: Record<GenericEntityType | EntityType, IconType> = {
  ...EntityIconByType,
  container: 'container',
};

export const UniversalEntityFlyoutHeader = ({
  entity,
  timestamp,
}: UniversalEntityFlyoutHeaderProps) => {
  const { euiTheme } = useEuiTheme();

  return (
    <>
      <FlyoutHeader>
        <EuiFlexGroup gutterSize="s" responsive={false} direction="column">
          {timestamp && (
            <EuiFlexItem grow={false}>
              <EuiText size="xs">
                <PreferenceFormattedDate value={timestamp} />
                <EuiSpacer size="xs" />
              </EuiText>
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={false}>
            <FlyoutTitle
              title={entity?.name}
              iconType={UniversalEntityIconByType[entity?.type] || 'globe'}
              iconColor="primary"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </FlyoutHeader>
      <div
        css={css`
          margin: ${euiTheme.size.s};
        `}
      >
        <HeaderDataCards
          id={entity.id}
          type={entity.type}
          category={entity.category}
          criticality={entity.criticality}
        />
        {(entity.tags || entity.labels) && (
          <>
            <EuiSpacer size="s" />
            <HeaderTags tags={entity.tags} labels={entity.labels} />
          </>
        )}
      </div>
    </>
  );
};
