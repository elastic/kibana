/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions } from 'kea';

import { EuiFieldText, EuiFormRow, EuiSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { RelevanceTuningLogic } from '../..';
import { PROXIMITY_BOOST_FUNCTION_DISPLAY_MAP } from '../../constants';
import { BoostType, ProximityBoost, ProximityBoostFunction } from '../../types';

interface Props {
  boost: ProximityBoost;
  index: number;
  name: string;
}

export const ProximityBoostForm: React.FC<Props> = ({ boost, index, name }) => {
  const { updateBoostSelectOption, updateBoostCenter } = useActions(RelevanceTuningLogic);

  const currentBoostCenter = boost.center !== undefined ? boost.center.toString() : '';
  const currentBoostFunction = boost.function || ProximityBoostFunction.Gaussian;

  const functionOptions = Object.values(ProximityBoostFunction).map((boostFunction) => ({
    value: boostFunction,
    text: PROXIMITY_BOOST_FUNCTION_DISPLAY_MAP[boostFunction as ProximityBoostFunction],
  }));

  return (
    <>
      <EuiFormRow
        label={i18n.translate(
          'xpack.enterpriseSearch.appSearch.engine.relevanceTuning.boosts.proximity.functionDropDownLabel',
          {
            defaultMessage: 'Function',
          }
        )}
        fullWidth
      >
        <EuiSelect
          name={`proximity-${BoostType.Proximity}${index}`}
          options={functionOptions}
          value={currentBoostFunction}
          onChange={(e) =>
            updateBoostSelectOption(
              name,
              index,
              'function',
              e.target.value as ProximityBoostFunction
            )
          }
          fullWidth
        />
      </EuiFormRow>
      <EuiFormRow
        label={i18n.translate(
          'xpack.enterpriseSearch.appSearch.engine.relevanceTuning.boosts.proximity.centerLabel',
          {
            defaultMessage: 'Center',
          }
        )}
        fullWidth
      >
        <EuiFieldText
          defaultValue={currentBoostCenter}
          onChange={(e) => updateBoostCenter(name, index, e.target.value)}
          fullWidth
        />
      </EuiFormRow>
    </>
  );
};
