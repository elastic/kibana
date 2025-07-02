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
import { HeaderDataCards } from './header_data_cards';
import type { GenericEntityRecord } from '../../../asset_inventory/types/generic_entity_record';
import type { EntityType } from '../../../../common/entity_analytics/types';
import { ExpandableBadgeGroup } from './components/expandable_badge_group';
import { EntityIconByType } from '../../../entity_analytics/components/entity_store/helpers';
import { PreferenceFormattedDate } from '../../../common/components/formatted_date';
import { FlyoutHeader } from '../../shared/components/flyout_header';
import { FlyoutTitle } from '../../shared/components/flyout_title';

const initialBadgeLimit = 3;
const maxBadgeContainerHeight = 200;

const HeaderTags = ({
  tags = [],
  labels = {},
}: {
  tags: GenericEntityRecord['tags'];
  labels: GenericEntityRecord['labels'];
}) => {
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
                color: ${euiTheme.colors.textDisabled};
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
    [labels, euiTheme.colors.textDisabled, euiTheme.border.thick, euiTheme.size.xs]
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

interface GenericEntityFlyoutHeaderProps {
  entity: EntityEcs;
  source: GenericEntityRecord;
}

// TODO: Asset Inventory - move this to a shared location, for now it's here as a mock since we dont have generic entities yet
enum GenericEntityType {
  container = 'container',
}

export const GenericEntityIconByType: Record<GenericEntityType | EntityType, IconType> = {
  ...EntityIconByType,
  container: 'container',
};

const isDate = (value: unknown): value is Date => value instanceof Date;

export const GenericEntityFlyoutHeader = ({ entity, source }: GenericEntityFlyoutHeaderProps) => {
  const { euiTheme } = useEuiTheme();

  const docTimestamp = source?.['@timestamp'];
  const timestamp = isDate(docTimestamp) ? docTimestamp : undefined;

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
              iconType={GenericEntityIconByType[entity?.type] || 'globe'}
              iconColor="primary"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        <>
          <div
            css={css`
              margin-bottom: ${euiTheme.size.s};
            `}
          >
            {(source.tags || source.labels) && (
              <>
                <EuiSpacer size="s" />
                <HeaderTags tags={source.tags} labels={source.labels} />
              </>
            )}
          </div>
          <HeaderDataCards id={entity.id} type={entity.type} subType={entity.sub_type} />
        </>
      </FlyoutHeader>
    </>
  );
};
