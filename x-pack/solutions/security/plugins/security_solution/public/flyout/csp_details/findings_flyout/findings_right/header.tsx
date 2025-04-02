/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiSpacer, EuiText, EuiFlexItem, EuiFlexGroup, useEuiTheme } from '@elastic/eui';
// import type { EntityType } from '../../../../common/entity_analytics/types';
// import { ExpandableBadgeGroup } from './components/expandable_badge_group';
import { PreferenceFormattedDate } from '../../../../common/components/formatted_date';
// import { EntityIconByType } from '../../../entity_analytics/components/entity_store/helpers';
import { FlyoutHeader } from '../../../shared/components/flyout_header';
import { FlyoutTitle } from '../../../shared/components/flyout_title';
import { FindingsMisconfigurationFull } from '../helper';
import { useKibana } from '../../../../common/lib/kibana';

interface FindingsMisconfigurationFlyoutHeaderProps {
  ruleName: string;
  timestamp?: Date;
  rulesTags?: string[];
  resourceName?: string;
  framework?: string[];
  vendor?: string;
  ruleBenchmarkId?: string;
  ruleBenchmarkName?: string;
}

export const FindingsMisconfigurationFlyoutHeader = ({
  ruleName,
  timestamp,
  rulesTags,
  resourceName,
  framework,
  vendor,
  ruleBenchmarkId,
  ruleBenchmarkName,
}: FindingsMisconfigurationFlyoutHeaderProps) => {
  const { euiTheme } = useEuiTheme();

  return (
    <>
      <FlyoutHeader>
        <EuiFlexGroup gutterSize="xs" responsive={false} direction="column">
          {timestamp && (
            <EuiFlexItem grow={false}>
              <EuiText size="xs">
                <b>{'Evaluated at '}</b>
                <PreferenceFormattedDate value={timestamp} />
                <EuiSpacer size="xs" />
              </EuiText>
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={false}>
            <FlyoutTitle title={ruleName} />
          </EuiFlexItem>
        </EuiFlexGroup>
        <FindingsMisconfigurationFull
          ruleName={ruleName}
          timestamp={timestamp || new Date()}
          rulesTags={rulesTags || []}
          resourceName={resourceName || ''}
          framework={framework || []}
          vendor={vendor || ''}
          ruleBenchmarkId={ruleBenchmarkId || ''}
          ruleBenchmarkName={ruleBenchmarkName || ''}
        />
      </FlyoutHeader>
      <div
        css={css`
          margin: ${euiTheme.size.s};
        `}
      />
    </>
  );
};
