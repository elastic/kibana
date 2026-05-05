/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiAccordion,
  EuiCheckbox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiBadge,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { FilterOption } from '../../mock_data';

interface FilterSectionProps {
  title: string;
  options: FilterOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

const rowStyles = css`
  padding: 4px 0 4px 4px;
  align-items: center;
`;

const labelStyles = css`
  cursor: pointer;
  user-select: none;
`;

export const FilterSection = ({ title, options, selected, onChange }: FilterSectionProps) => {
  const [open, setOpen] = useState(true);

  const toggle = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  const clearAll = () => onChange([]);

  const accordionTitle = (
    <EuiText size="xs" color="subdued">
      <strong>{title}</strong>
    </EuiText>
  );

  const accordionExtra = (
    <EuiText
      size="xs"
      color={selected.length > 0 ? 'primary' : 'subdued'}
      css={css`
        cursor: ${selected.length > 0 ? 'pointer' : 'default'};
      `}
      onClick={selected.length > 0 ? clearAll : undefined}
    >
      All
    </EuiText>
  );

  return (
    <EuiAccordion
      id={`filter-section-${title}`}
      buttonContent={accordionTitle}
      extraAction={accordionExtra}
      initialIsOpen={open}
      onToggle={setOpen}
      paddingSize="none"
    >
      <EuiSpacer size="xs" />
      {options.map((opt) => (
        <EuiFlexGroup key={opt.id} gutterSize="s" css={rowStyles} responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiCheckbox
              id={`filter-${title}-${opt.id}`}
              checked={selected.includes(opt.id)}
              onChange={() => toggle(opt.id)}
              label=""
              compressed
            />
          </EuiFlexItem>
          <EuiFlexItem css={labelStyles} onClick={() => toggle(opt.id)}>
            <EuiText size="xs">{opt.label}</EuiText>
          </EuiFlexItem>
          {opt.count !== undefined && (
            <EuiFlexItem grow={false}>
              <EuiBadge color="hollow">{opt.count}</EuiBadge>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      ))}
      <EuiSpacer size="s" />
    </EuiAccordion>
  );
};
