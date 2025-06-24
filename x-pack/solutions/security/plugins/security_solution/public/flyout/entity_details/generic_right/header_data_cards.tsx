/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiButtonIcon,
  EuiCallOut,
  EuiCopy,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiSuperSelect,
  EuiTextTruncate,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EntityIdentifierFields } from '../../../../common/entity_analytics/types';
import { useGenericEntityCriticality } from './hooks/use_generic_entity_criticality';
import { assetCriticalityOptions } from '../../../entity_analytics/components/asset_criticality/asset_criticality_selector';
import { ResponsiveDataCards } from './components/responsive_data_cards';

type CustomCriticalityError = Error & {
  body?: {
    message?: string;
  };
};

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
              valueOfSelected={getAssetCriticality.data?.criticality_level || 'unassigned'}
              onChange={(newValue) => {
                assignAssetCriticality.mutate({
                  criticalityLevel: newValue,
                  idField: EntityIdentifierFields.generic,
                  idValue: id,
                });
              }}
              isInvalid={assignAssetCriticality.isError}
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
    [getAssetCriticality.data?.criticality_level, id, type, subType, assignAssetCriticality]
  );

  return (
    <>
      {assignAssetCriticality.isError && (
        <>
          <EuiCallOut
            onDismiss={() => {
              assignAssetCriticality.reset();
            }}
            title={
              <FormattedMessage
                id="xpack.securitySolution.genericEntityFlyout.flyoutHeader.headerDataBoxes.assignCriticalityErrorTitle"
                defaultMessage="We could not assign the selected criticality"
              />
            }
            color="danger"
            iconType="error"
          >
            <p>
              {(assignAssetCriticality.error as CustomCriticalityError)?.body?.message ||
                i18n.translate(
                  'xpack.securitySolution.genericEntityFlyout.flyoutHeader.headerDataBoxes.assignCriticalityErrorText',
                  {
                    defaultMessage: 'Something went wrong during validation. Please try again.',
                  }
                )}
            </p>
          </EuiCallOut>
          <EuiSpacer />
        </>
      )}
      <ResponsiveDataCards cards={cards} collapseWidth={750} />
    </>
  );
};
