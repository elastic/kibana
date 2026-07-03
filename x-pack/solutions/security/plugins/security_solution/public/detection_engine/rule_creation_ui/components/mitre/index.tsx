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
import type {
  MitreSubTechnique,
  MitreTactic,
  MitreTechnique,
} from '../../../../../common/detection_engine/mitre/types';
import { createUnsupportedMitreOption } from './unsupported_mitre_option';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { normalizeThreatsToCurrentMitre } from './normalize_threats_to_current_mitre';

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
  const isMitreAttackUpdatesUIEnabled = useIsExperimentalFeatureEnabled(
    'mitreAttackUpdatesUIEnabled'
  );

  const [tacticsOptions, setTacticsOptions] = useState<MitreTactic[]>([]);
  const [techniquesOptions, setTechniquesOptions] = useState<MitreTechnique[]>([]);
  const [subtechniquesOptions, setSubtechniquesOptions] = useState<MitreSubTechnique[]>([]);

  useEffect(() => {
    async function getMitre() {
      const mitreConfig = await lazyMitreConfiguration();
      setTacticsOptions(mitreConfig.tactics);
      setTechniquesOptions(mitreConfig.techniques);
      setSubtechniquesOptions(mitreConfig.subtechniques);
    }

    getMitre();
  }, []);

  /**
   * Persists a new threats value, snapping any drifted (renamed) MITRE entries to the
   * currently bundled dataset. Because this only runs on an actual interaction with the
   * section, an untouched (pristine) section is never rewritten on save.
   */
  const setThreatsValue = useCallback(
    (threats: Threats) => {
      field.setValue(
        isMitreAttackUpdatesUIEnabled
          ? normalizeThreatsToCurrentMitre(threats, {
              tactics: tacticsOptions,
              techniques: techniquesOptions,
              subtechniques: subtechniquesOptions,
            })
          : threats
      );
    },
    [field, isMitreAttackUpdatesUIEnabled, subtechniquesOptions, tacticsOptions, techniquesOptions]
  );

  const removeTactic = useCallback(
    (index: number) => {
      const values = [...(field.value as Threats)];
      values.splice(index, 1);
      if (isEmpty(values)) {
        setThreatsValue(threatDefault);
      } else {
        setThreatsValue(values);
      }
    },
    [field, setThreatsValue]
  );

  const addMitreAttackTactic = useCallback(() => {
    const values = [...(field.value as Threats)];
    const emptyTactic: Threat = {
      framework: 'MITRE ATT&CK',
      tactic: { id: 'none', name: 'none', reference: 'none' },
      technique: [],
    };
    if (!isEmpty(values[values.length - 1])) {
      setThreatsValue([...values, emptyTactic]);
    } else {
      setThreatsValue([emptyTactic]);
    }
  }, [field, setThreatsValue]);

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
      setThreatsValue([...values]);
    },
    [field, setThreatsValue, tacticsOptions]
  );

  const values = useMemo(() => {
    return [...(field.value as Threats)];
  }, [field]);

  const findCurrentTacticOption = useCallback(
    (threat: Threat) =>
      threat.tactic.name === 'none' || tacticsOptions.length === 0
        ? undefined
        : tacticsOptions.find((t) => t.id === threat.tactic.id),
    [tacticsOptions]
  );

  const isUnsupportedTactic = useCallback(
    (threat: Threat) =>
      isMitreAttackUpdatesUIEnabled &&
      tacticsOptions.length > 0 &&
      threat.tactic.name !== 'none' &&
      findCurrentTacticOption(threat) === undefined,
    [findCurrentTacticOption, isMitreAttackUpdatesUIEnabled, tacticsOptions]
  );

  const getRenamedFromName = useCallback(
    (threat: Threat) => {
      if (!isMitreAttackUpdatesUIEnabled) return undefined;
      const matchedOption = findCurrentTacticOption(threat);
      return matchedOption && matchedOption.name !== threat.tactic.name
        ? threat.tactic.name
        : undefined;
    },
    [findCurrentTacticOption, isMitreAttackUpdatesUIEnabled]
  );

  const getSelectTactic = useCallback(
    (threat: Threat, index: number, disabled: boolean) => {
      const tacticName = threat.tactic.name;
      const isUnsupported = isUnsupportedTactic(threat);
      const matchedOption = findCurrentTacticOption(threat);
      const valueOfSelected = isUnsupported
        ? threat.tactic.id
        : matchedOption?.value ?? camelCase(tacticName);
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
                ...(isUnsupported
                  ? [
                      createUnsupportedMitreOption({
                        id: threat.tactic.id,
                        name: threat.tactic.name,
                      }),
                    ]
                  : []),
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
              valueOfSelected={valueOfSelected}
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
      findCurrentTacticOption,
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
      setThreatsValue(threats);
    },
    [setThreatsValue]
  );

  return (
    <MitreAttackContainer>
      {values.map((threat, index) => {
        const tacticUnsupported = isUnsupportedTactic(threat);
        const tacticError = tacticUnsupported
          ? i18n.UNSUPPORTED_MITRE_ID_ERROR(threat.tactic.id)
          : undefined;
        const tacticRenamedFrom = getRenamedFromName(threat);
        const tacticHelpText = tacticRenamedFrom
          ? i18n.RENAMED_FROM_HINT(tacticRenamedFrom)
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
                helpText={tacticHelpText}
              >
                <>{getSelectTactic(threat, index, isDisabled)}</>
              </EuiFormRow>
            ) : (
              <EuiFormRow
                fullWidth
                describedByIds={idAria ? [`${idAria} ${i18n.TACTIC}`] : undefined}
                isInvalid={tacticUnsupported}
                error={tacticError}
                helpText={tacticHelpText}
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
