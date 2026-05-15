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
  EuiSpacer,
  EuiText,
  htmlIdGenerator,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { useHistory } from 'react-router-dom';
import { LogoIcon } from '../logo_icon';
import type { ApproachOption } from './types';

interface ApproachSelectorProps {
  legend: string;
  selectedId: string;
  options: ApproachOption[];
}

export const ApproachSelector: React.FC<ApproachSelectorProps> = ({
  legend,
  selectedId,
  options,
}) => {
  const history = useHistory();
  // Each render gets its own radio-group id so multiple selectors on the same
  // page (or remounts in tests) do not cross-talk via the shared `name` attr.
  const radioGroupId = useMemo(() => htmlIdGenerator('approachSelector')(), []);

  return (
    <nav aria-label={legend} data-test-subj="approachSelector">
      <EuiFlexGrid columns={2}>
        {options.map((option) => {
          const isSelected = option.id === selectedId;
          return (
            <EuiFlexItem
              key={option.id}
              // EuiCheckableCard does not forward `data-test-subj`, so the
              // wrapper carries the selector + selection state for tests.
              data-test-subj={`approachSelectorCard-${option.id}`}
              data-selected={isSelected ? 'true' : 'false'}
            >
              <EuiCheckableCard
                id={`${radioGroupId}_${option.id}`}
                name={radioGroupId}
                checked={isSelected}
                // The radio's onChange fires only when the selection actually
                // changes, which dedupes the double-fire we'd get from the
                // panel-level onClick (label-click + radio-click bubble).
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
                            data-test-subj={`approachSelectorRecommendedBadge-${option.id}`}
                          >
                            {i18n.translate(
                              'xpack.observability_onboarding.approachSelector.recommendedBadge',
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

                  & > .euiPanel {
                    display: flex;

                    & > .euiCheckableCard__label {
                      display: flex;
                      flex-direction: column;
                    }
                  }
                `}
              />
            </EuiFlexItem>
          );
        })}
      </EuiFlexGrid>
    </nav>
  );
};
