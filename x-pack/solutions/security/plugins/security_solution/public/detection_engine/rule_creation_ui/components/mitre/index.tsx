/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSuperSelect,
  EuiToolTip,
} from '@elastic/eui';
import { camelCase, isEmpty } from 'lodash/fp';
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';

import { isEqual } from 'lodash';
import type { Threat, Threats } from '@kbn/securitysolution-io-ts-alerting-types';
import * as Rulei18n from '../../../common/translations';
import type { FieldHook } from '../../../../shared_imports';
import { threatDefault } from '../step_about_rule/default_value';
import { MyAddItemButton } from '../add_item_form';
import * as i18n from './translations';
import { MitreAttackTechniqueFields } from './technique_fields';
import type { MitreTactic } from '../../../../../common/detection_engine/mitre/types';
import { createUnsupportedMitreOption } from './unsupported_mitre_option';

const lazyMitreConfiguration = () => {
  /**
   * The specially formatted comment in the `import` expression causes the corresponding webpack chunk to be named. This aids us in debugging chunk size issues.
   * See https://webpack.js.org/api/module-methods/#magic-comments
   */
  return import(
    /* webpackChunkName: "lazy_mitre_configuration" */
    '../../../../../common/detection_engine/mitre/mitre_tactics_techniques'
  );
};

const MitreAttackContainer = styled.div`
  margin-top: 16px;
`;

interface AddItemProps {
  field: FieldHook;
  dataTestSubj: string; // eslint-disable-line react/no-unused-prop-types
  idAria: string;
  isDisabled: boolean;
}

// eslint-disable-next-line react/display-name
export const AddMitreAttackThreat = memo(({ field, idAria, isDisabled }: AddItemProps) => {
  const removeTactic = useCallback(
    (index: number) => {
      const values = [...(field.value as Threats)];
      values.splice(index, 1);
      if (isEmpty(values)) {
        field.setValue(threatDefault);
      } else {
        field.setValue(values);
      }
    },
    [field]
  );

  const addMitreAttackTactic = useCallback(() => {
    const values = [...(field.value as Threats)];
    if (!isEmpty(values[values.length - 1])) {
      field.setValue([
        ...values,
        { tactic: { id: 'none', name: 'none', reference: 'none' }, technique: [] },
      ]);
    } else {
      field.setValue([{ tactic: { id: 'none', name: 'none', reference: 'none' }, technique: [] }]);
    }
  }, [field]);

  const [tacticsOptions, setTacticsOptions] = useState<MitreTactic[]>([]);

  useEffect(() => {
    async function getMitre() {
      const mitreConfig = await lazyMitreConfiguration();
      setTacticsOptions(mitreConfig.tactics);
    }

    getMitre();
  }, []);

  const updateTactic = useCallback(
    (index: number, value: string) => {
      const values = [...(field.value as Threats)];
      const { id, reference, name } = tacticsOptions.find((t) => t.value === value) || {
        id: '',
        name: '',
        reference: '',
      };
      values.splice(index, 1, {
        ...values[index],
        tactic: { id, reference, name },
        technique: [],
      });
      field.setValue([...values]);
    },
    [field, tacticsOptions]
  );

  const values = useMemo(() => {
    return [...(field.value as Threats)];
  }, [field]);

  const isUnsupportedTactic = useCallback(
    (threat: Threat) =>
      tacticsOptions.length > 0 &&
      threat.tactic.name !== 'none' &&
      !tacticsOptions.some((t) => t.id === threat.tactic.id),
    [tacticsOptions]
  );

  const getSelectTactic = useCallback(
    (threat: Threat, index: number, disabled: boolean) => {
      const tacticName = threat.tactic.name;
      const isUnsupported = isUnsupportedTactic(threat);
      return (
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiFlexItem grow>
            <EuiSuperSelect
              id="mitreAttackTactic"
              options={[
                ...(tacticName === 'none'
                  ? [
                      {
                        inputDisplay: <>{i18n.TACTIC_PLACEHOLDER}</>,
                        value: 'none',
                        disabled,
                      },
                    ]
                  : []),
                ...(isUnsupported ? [createUnsupportedMitreOption(threat.tactic.id)] : []),
                ...tacticsOptions.map((t) => ({
                  inputDisplay: <>{t.label}</>,
                  value: t.value,
                  disabled,
                })),
              ]}
              prepend={`${field.label} ${i18n.TACTIC}`}
              aria-label=""
              onChange={updateTactic.bind(null, index)}
              fullWidth={true}
              valueOfSelected={isUnsupported ? threat.tactic.id : camelCase(tacticName)}
              data-test-subj="mitreAttackTactic"
              placeholder={i18n.TACTIC_PLACEHOLDER}
              isInvalid={isUnsupported}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiToolTip content={Rulei18n.DELETE} disableScreenReaderOutput>
              <EuiButtonIcon
                color="danger"
                iconType="trash"
                isDisabled={isDisabled || isEqual(values, threatDefault)}
                onClick={() => removeTactic(index)}
                aria-label={Rulei18n.DELETE}
              />
            </EuiToolTip>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    },
    [
      field.label,
      isDisabled,
      isUnsupportedTactic,
      removeTactic,
      tacticsOptions,
      updateTactic,
      values,
    ]
  );

  /**
   * Uses the fieldhook to set a new field value
   *
   * Value is memoized on top level props, any deep changes will have to be new objects
   */
  const onFieldChange = useCallback(
    (threats: Threats) => {
      field.setValue(threats);
    },
    [field]
  );

  return (
    <MitreAttackContainer>
      {values.map((threat, index) => {
        const tacticUnsupported = isUnsupportedTactic(threat);
        const tacticError = tacticUnsupported
          ? i18n.UNSUPPORTED_MITRE_ID_ERROR(threat.tactic.id)
          : undefined;
        return (
          <div key={index}>
            {index === 0 ? (
              <EuiFormRow
                fullWidth
                label={`${field.label} ${i18n.THREATS}`}
                labelAppend={field.labelAppend}
                describedByIds={idAria ? [`${idAria} ${i18n.TACTIC}`] : undefined}
                isInvalid={tacticUnsupported}
                error={tacticError}
              >
                <>{getSelectTactic(threat, index, isDisabled)}</>
              </EuiFormRow>
            ) : (
              <EuiFormRow
                fullWidth
                describedByIds={idAria ? [`${idAria} ${i18n.TACTIC}`] : undefined}
                isInvalid={tacticUnsupported}
                error={tacticError}
              >
                {getSelectTactic(threat, index, isDisabled)}
              </EuiFormRow>
            )}

            <MitreAttackTechniqueFields
              field={field}
              threatIndex={index}
              isDisabled={isDisabled || threat.tactic.name === 'none'}
              idAria={idAria}
              onFieldChange={onFieldChange}
            />
          </div>
        );
      })}
      <MyAddItemButton
        data-test-subj="addMitreAttackTactic"
        onClick={addMitreAttackTactic}
        isDisabled={isDisabled}
      >
        {i18n.ADD_MITRE_TACTIC}
      </MyAddItemButton>
    </MitreAttackContainer>
  );
});
