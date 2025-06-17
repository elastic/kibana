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

import React, { useMemo, useCallback } from 'react';
import {
  EuiButtonIcon,
  EuiCopy,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSuperSelect,
  EuiTextTruncate,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { EntityIdentifierFields } from '../../../../common/entity_analytics/types';
import { useGenericEntityCriticality } from './hooks/use_generic_entity_criticality';
import type { CriticalityLevelWithUnassigned } from '../../../../common/entity_analytics/asset_criticality/types';
import { assetCriticalityOptions } from '../../../entity_analytics/components/asset_criticality/asset_criticality_selector';
import { ResponsiveDataCards } from './components/responsive_data_cards';

export const HeaderDataCards = ({
  id,
  subType,
  type,
}: {
  id: string;
  subType: string;
  type: string;
}) => {
  const { getAssetCriticality, assignAssetCriticality } = useGenericEntityCriticality({
    idField: EntityIdentifierFields.generic,
    idValue: id,
  });

  const criticality = getAssetCriticality.data?.criticality_level;

  const assignCriticality = useCallback(
    (value: CriticalityLevelWithUnassigned) => {
      assignAssetCriticality.mutate({
        criticalityLevel: value,
        idField: EntityIdentifierFields.generic,
        idValue: id,
      });
    },
    [assignAssetCriticality, id]
  );

  const cards = useMemo(
    () => [
      {
        title: i18n.translate(
          'xpack.securitySolution.genericEntityFlyout.flyoutHeader.headerDataBoxes.criticalityLabel',
          {
            defaultMessage: 'Criticality',
          }
        ),
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
              options={assetCriticalityOptions}
              valueOfSelected={criticality || 'unassigned'}
              onChange={(newValue) => {
                assignCriticality(newValue);
              }}
            />
          </div>
        ),
      },
      {
        title: (
          <EuiFlexGroup justifyContent={'spaceBetween'} wrap={false} responsive={false}>
            <EuiFlexItem grow={false}>{'ID'}</EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiCopy textToCopy={id}>
                {(copy) => <EuiButtonIcon onClick={copy} iconType="document" color="text" />}
              </EuiCopy>
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
        description: <EuiTextTruncate text={id} />,
      },
      {
        title: i18n.translate(
          'xpack.securitySolution.genericEntityFlyout.flyoutHeader.headerDataBoxes.typeLabel',
          {
            defaultMessage: 'Type',
          }
        ),
        description: <EuiTextTruncate text={type || ''} />,
      },
      {
        title: i18n.translate(
          'xpack.securitySolution.genericEntityFlyout.flyoutHeader.headerDataBoxes.subtypeLabel',
          {
            defaultMessage: 'Sub Type',
          }
        ),
        description: <EuiTextTruncate text={subType || ''} />,
      },
    ],
    [id, subType, type, assignCriticality, criticality]
  );

  return <ResponsiveDataCards cards={cards} collapseWidth={750} />;
};
