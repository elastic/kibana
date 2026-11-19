/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiBadge,
  EuiCheckableCard,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormFieldset,
  EuiSpacer,
  EuiText,
  htmlIdGenerator,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { useHistory } from 'react-router-dom';
import { LogoIcon } from '../logo_icon';
import type { CollectionMethodOption } from './types';

interface CollectionMethodSelectorProps {
  legend: string;
  selectedId: string;
  options: CollectionMethodOption[];
}

export const CollectionMethodSelector: React.FC<CollectionMethodSelectorProps> = ({
  legend,
  selectedId,
  options,
}) => {
  const history = useHistory();
  const radioGroupId = useMemo(() => htmlIdGenerator('collectionMethodSelector')(), []);

  return (
    <EuiFormFieldset
      legend={{ children: legend, display: 'hidden' }}
      data-test-subj="collectionMethodSelector"
    >
      <EuiFlexGrid columns={2}>
        {options.map((option) => {
          const isSelected = option.id === selectedId;
          return (
            <EuiFlexItem
              key={option.id}
              data-test-subj={`collectionMethodSelectorCard-${option.id}`}
              data-selected={isSelected ? 'true' : 'false'}
            >
              <EuiCheckableCard
                id={`${radioGroupId}_${option.id}`}
                name={radioGroupId}
                checked={isSelected}
                // onChange (not onClick) dedupes the label+radio bubble double-fire.
                onChange={() => {
                  history.push(option.navigateTo);
                }}
                label={
                  <>
                    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
                      {(option.logo || option.euiIconType) && (
                        <EuiFlexItem grow={false}>
                          <LogoIcon logo={option.logo} euiIconType={option.euiIconType} size="m" />
                        </EuiFlexItem>
                      )}
                      <EuiFlexItem grow={false}>
                        <EuiText size="s">
                          <strong>{option.label}</strong>
                        </EuiText>
                      </EuiFlexItem>
                      {option.recommended && (
                        <EuiFlexItem grow={false}>
                          <EuiBadge
                            color="success"
                            data-test-subj={`collectionMethodSelectorRecommendedBadge-${option.id}`}
                          >
                            {i18n.translate(
                              'xpack.observability_onboarding.collectionMethodSelector.recommendedBadge',
                              { defaultMessage: 'Recommended' }
                            )}
                          </EuiBadge>
                        </EuiFlexItem>
                      )}
                    </EuiFlexGroup>
                    <EuiSpacer size="s" />
                    <EuiText color="subdued" size="s">
                      {option.description}
                    </EuiText>
                  </>
                }
                css={css`
                  flex-grow: 1;
                `}
              />
            </EuiFlexItem>
          );
        })}
      </EuiFlexGrid>
    </EuiFormFieldset>
  );
};
