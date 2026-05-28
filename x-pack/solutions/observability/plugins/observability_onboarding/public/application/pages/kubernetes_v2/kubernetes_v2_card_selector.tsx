/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiCheckableCard,
  EuiFlexGrid,
  EuiFlexItem,
  EuiFormFieldset,
  EuiSpacer,
  EuiText,
  htmlIdGenerator,
} from '@elastic/eui';
import { css } from '@emotion/react';

export interface KubernetesV2CardOption<TId extends string> {
  id: TId;
  label: string;
  description?: string;
}

interface KubernetesV2CardSelectorProps<TId extends string> {
  legend: string;
  selectedId: TId;
  options: Array<KubernetesV2CardOption<TId>>;
  onChange: (id: TId) => void;
  dataTestSubjPrefix: string;
}

export const KubernetesV2CardSelector = <TId extends string>({
  legend,
  selectedId,
  options,
  onChange,
  dataTestSubjPrefix,
}: KubernetesV2CardSelectorProps<TId>) => {
  const radioGroupId = useMemo(() => htmlIdGenerator('kubernetesV2CardSelector')(), []);

  return (
    <EuiFormFieldset legend={{ children: legend, display: 'hidden' }}>
      <EuiFlexGrid columns={2}>
        {options.map((option) => {
          const isSelected = option.id === selectedId;
          return (
            <EuiFlexItem
              key={option.id}
              data-test-subj={`${dataTestSubjPrefix}-${option.id}`}
              data-selected={isSelected ? 'true' : 'false'}
            >
              <EuiCheckableCard
                id={`${radioGroupId}_${option.id}`}
                name={radioGroupId}
                checked={isSelected}
                onChange={() => {
                  onChange(option.id);
                }}
                label={
                  <>
                    <EuiText size="s">
                      <strong>{option.label}</strong>
                    </EuiText>
                    {option.description ? (
                      <>
                        <EuiSpacer size="s" />
                        <EuiText color="subdued" size="s">
                          {option.description}
                        </EuiText>
                      </>
                    ) : null}
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
