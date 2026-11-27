/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiFlexItem } from '@elastic/eui';
import type { RuleSetConditions } from '../../../../common/api/detection_engine/rule_sets';
import { useIntegrationTitles } from '../components/group_by_fields';
import { allFacetFields } from './facet_fields';
import * as i18n from './translations';

/**
 * The facet selections as chips above the table: one chip for the included values of a field and
 * one for its excluded values, each with a remove button.
 */
export const ActiveFacetChips = ({
  conditions,
  onChange,
}: {
  conditions: RuleSetConditions;
  onChange: (next: RuleSetConditions) => void;
}) => {
  const labels = { integrationTitles: useIntegrationTitles() };
  const chips = allFacetFields(undefined, conditions).flatMap((field) => {
    const { include, exclude } = field.get(conditions);
    const text = (values: string[]) =>
      `${field.label}: ${values.map((v) => field.valueLabel(v, labels)).join(', ')}`;
    return [
      ...(include.length
        ? [
            {
              key: `${field.id}-include`,
              label: text(include),
              color: 'hollow',
              remove: () => onChange(field.set(conditions, { include: [], exclude })),
            },
          ]
        : []),
      ...(exclude.length
        ? [
            {
              key: `${field.id}-exclude`,
              label: `${i18n.NOT} ${text(exclude)}`,
              color: 'danger',
              remove: () => onChange(field.set(conditions, { include, exclude: [] })),
            },
          ]
        : []),
    ];
  });

  return (
    <>
      {chips.map(({ key, label, color, remove }) => (
        <EuiFlexItem grow={false} key={key}>
          <EuiBadge
            color={color}
            iconType="cross"
            iconSide="right"
            iconOnClick={remove}
            iconOnClickAriaLabel={i18n.REMOVE_FILTER(label)}
            data-test-subj="ruleFacetChip"
          >
            {label}
          </EuiBadge>
        </EuiFlexItem>
      ))}
    </>
  );
};
