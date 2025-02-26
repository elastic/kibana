/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in the Elastic License
 * 2.0.
 */

import React, { useState, useMemo } from 'react';
import {
  EuiButtonIcon,
  EuiCopy,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSuperSelect,
  EuiTextTruncate,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { AssetCriticalityBadge } from '../../../entity_analytics/components/asset_criticality';
import { ResponsiveDataCards } from './components/responsive_data_cards';

const getCopyCard = ({ title, description }) => ({
  title: (
    <EuiFlexGroup justifyContent={'spaceBetween'} wrap={false} responsive={false}>
      <EuiFlexItem grow={false}>{title}</EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiCopy textToCopy={description}>
          {(copy) => <EuiButtonIcon onClick={copy} iconType={'document'} color={'subdued'} />}
        </EuiCopy>
      </EuiFlexItem>
    </EuiFlexGroup>
  ),
  description: <EuiTextTruncate text={description} />,
});

const options = [
  {
    value: 'unassigned',
    inputDisplay: (
      <AssetCriticalityBadge criticalityLevel={'unassigned'} style={{ lineHeight: 'inherit' }} />
    ),
  },
  {
    value: 'low_impact',
    inputDisplay: (
      <AssetCriticalityBadge criticalityLevel={'low_impact'} style={{ lineHeight: 'inherit' }} />
    ),
  },
  {
    value: 'medium_impact',
    inputDisplay: (
      <AssetCriticalityBadge criticalityLevel={'medium_impact'} style={{ lineHeight: 'inherit' }} />
    ),
  },
  {
    value: 'high_impact',
    inputDisplay: (
      <AssetCriticalityBadge criticalityLevel={'high_impact'} style={{ lineHeight: 'inherit' }} />
    ),
  },
  {
    value: 'extreme_impact',
    inputDisplay: (
      <AssetCriticalityBadge
        criticalityLevel={'extreme_impact'}
        style={{ lineHeight: 'inherit' }}
      />
    ),
  },
];

export const HeaderDataCards = ({ entity }) => {
  const [selectValue, setSelectValue] = useState('low_impact');

  const cards = useMemo(
    () => [
      {
        title: 'Criticality',
        description: (
          <div
            css={css`
              width: fit-content;
            `}
          >
            <EuiSuperSelect
              popoverProps={{
                repositionOnScroll: true,
                panelMinWidth: 200,
              }}
              fullWidth={false}
              compressed
              hasDividers
              options={options}
              valueOfSelected={selectValue}
              onChange={(newValue) => setSelectValue(newValue)}
            />
          </div>
        ),
      },
      getCopyCard({ title: 'ID', description: '123123123123123123123' }),
      { title: 'Category', description: <EuiTextTruncate text={entity?.category} /> },
      { title: 'Type', description: <EuiTextTruncate text={entity?.type} /> },
    ],
    [selectValue, entity?.category, entity?.type]
  );

  return <ResponsiveDataCards cards={cards} collapseWidth={750} />;
};
