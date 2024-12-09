/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

import { useActions } from 'kea';

import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiTitle, EuiSuperSelect } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { SchemaType } from '../../../../shared/schema/types';

import { BoostIcon } from '../components';
import { FUNCTIONAL_DISPLAY, PROXIMITY_DISPLAY, VALUE_DISPLAY } from '../constants';
import { RelevanceTuningLogic } from '../relevance_tuning_logic';
import { Boost, BoostType } from '../types';

import { BoostItem } from './boost_item';

import './boosts.scss';

const BASE_OPTIONS = [
  {
    value: 'add-boost',
    inputDisplay: i18n.translate(
      'xpack.enterpriseSearch.appSearch.engine.relevanceTuning.boosts.addBoostDropDownOptionLabel',
      {
        defaultMessage: 'Add boost',
      }
    ),
    disabled: true,
  },
  {
    value: BoostType.Functional,
    inputDisplay: (
      <>
        <BoostIcon type={BoostType.Functional} />
        {FUNCTIONAL_DISPLAY}
      </>
    ),
  },
  {
    value: BoostType.Proximity,
    inputDisplay: (
      <>
        <BoostIcon type={BoostType.Proximity} />
        {PROXIMITY_DISPLAY}
      </>
    ),
  },
  {
    value: BoostType.Value,
    inputDisplay: (
      <>
        <BoostIcon type={BoostType.Value} />
        {VALUE_DISPLAY}
      </>
    ),
  },
];

const filterInvalidOptions = (value: BoostType, type: SchemaType) => {
  // Proximity and Functional boost types are not valid for text fields
  if (type === SchemaType.Text && [BoostType.Proximity, BoostType.Functional].includes(value))
    return false;
  // Value and Functional boost types are not valid for geolocation fields
  if (type === SchemaType.Geolocation && [BoostType.Functional, BoostType.Value].includes(value))
    return false;
  // Functional boosts are not valid for date fields
  if (type === SchemaType.Date && value === BoostType.Functional) return false;
  return true;
};

interface Props {
  name: string;
  type: SchemaType;
  boosts?: Boost[];
}

export const Boosts: React.FC<Props> = ({ name, type, boosts = [] }) => {
  const { addBoost } = useActions(RelevanceTuningLogic);

  const selectOptions = useMemo(
    () => BASE_OPTIONS.filter((option) => filterInvalidOptions(option.value as BoostType, type)),
    [type]
  );

  return (
    <EuiPanel color="subdued" className="boosts">
      <EuiFlexGroup responsive={false} alignItems="center">
        <EuiFlexItem>
          <EuiTitle size="xxs">
            <h4>
              {i18n.translate(
                'xpack.enterpriseSearch.appSearch.engine.relevanceTuning.boosts.title',
                {
                  defaultMessage: 'Boosts',
                }
              )}
            </h4>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiSuperSelect
            className="boosts__select"
            itemClassName="boostSelectOption"
            valueOfSelected={'add-boost'}
            options={selectOptions}
            onChange={(value) => addBoost(name, value as BoostType)}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      {boosts.map((boost, index) => (
        <BoostItem
          key={index}
          id={`boost-${name}-${index}`}
          boost={boost}
          name={name}
          index={index}
        />
      ))}
    </EuiPanel>
  );
};
