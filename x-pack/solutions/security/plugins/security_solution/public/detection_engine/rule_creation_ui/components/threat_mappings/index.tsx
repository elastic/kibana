/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiAccordion,
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFormRow,
  EuiPopover,
  EuiSpacer,
  EuiToolTip,
} from '@elastic/eui';
import React, { memo, useCallback, useMemo, useState } from 'react';

import { OptionalFieldLabel } from '../../../rule_creation/components/optional_field_label';
import { UseField, useFormContext } from '../../../../shared_imports';
import { MyAddItemButton } from '../add_item_form';
import { AddMitreAttackThreat } from '../mitre';
import { AddMitreAtlasThreat } from '../atlas';
import { atlasThreatDefault, threatDefault } from '../step_about_rule/default_value';
import * as i18n from './translations';

export type ThreatFrameworkId = 'attack' | 'atlas';

interface ThreatMappingsProps {
  isDisabled: boolean;
}

const FRAMEWORK_META: Record<
  ThreatFrameworkId,
  { label: string; fieldPath: 'threat' | 'atlasThreat'; defaultValue: typeof threatDefault }
> = {
  attack: {
    label: i18n.MITRE_ATTACK_FRAMEWORK,
    fieldPath: 'threat',
    defaultValue: threatDefault,
  },
  atlas: {
    label: i18n.MITRE_ATLAS_FRAMEWORK,
    fieldPath: 'atlasThreat',
    defaultValue: atlasThreatDefault,
  },
};

const ALL_FRAMEWORKS: ThreatFrameworkId[] = ['attack', 'atlas'];

export const ThreatMappings = memo(({ isDisabled }: ThreatMappingsProps) => {
  const { setFieldValue } = useFormContext();
  const [enabledFrameworks, setEnabledFrameworks] = useState<ThreatFrameworkId[]>([
    ...ALL_FRAMEWORKS,
  ]);
  const [isAddPopoverOpen, setIsAddPopoverOpen] = useState(false);

  const availableFrameworks = useMemo(
    () => ALL_FRAMEWORKS.filter((id) => !enabledFrameworks.includes(id)),
    [enabledFrameworks]
  );

  const closeAddPopover = useCallback(() => setIsAddPopoverOpen(false), []);
  const toggleAddPopover = useCallback(() => setIsAddPopoverOpen((open) => !open), []);

  const removeFramework = useCallback(
    (id: ThreatFrameworkId) => {
      const meta = FRAMEWORK_META[id];
      setFieldValue(meta.fieldPath, []);
      setEnabledFrameworks((current) => current.filter((frameworkId) => frameworkId !== id));
    },
    [setFieldValue]
  );

  const addFramework = useCallback(
    (id: ThreatFrameworkId) => {
      const meta = FRAMEWORK_META[id];
      setFieldValue(meta.fieldPath, meta.defaultValue);
      setEnabledFrameworks((current) =>
        ALL_FRAMEWORKS.filter((frameworkId) => current.includes(frameworkId) || frameworkId === id)
      );
      closeAddPopover();
    },
    [closeAddPopover, setFieldValue]
  );

  const addFrameworkItems = useMemo(
    () =>
      availableFrameworks.map((id) => (
        <EuiContextMenuItem
          key={id}
          data-test-subj={`threatMappingsAddFramework-${id}`}
          onClick={() => addFramework(id)}
          disabled={isDisabled}
        >
          {FRAMEWORK_META[id].label}
        </EuiContextMenuItem>
      )),
    [addFramework, availableFrameworks, isDisabled]
  );

  return (
    <EuiFormRow
      fullWidth
      label={i18n.THREAT_MAPPINGS}
      labelAppend={OptionalFieldLabel}
      data-test-subj="threatMappings"
    >
      <>
        <EuiSpacer size="m" />
        {enabledFrameworks.map((id, index) => {
          const meta = FRAMEWORK_META[id];
          return (
            <React.Fragment key={id}>
              {index > 0 ? <EuiSpacer size="m" /> : null}
              <EuiAccordion
                id={`threat-mapping-${id}`}
                data-test-subj={`threatMappingFramework-${id}`}
                buttonContent={meta.label}
                initialIsOpen={false}
                extraAction={
                  <EuiToolTip content={i18n.REMOVE_FRAMEWORK} disableScreenReaderOutput>
                    <EuiButtonIcon
                      color="danger"
                      iconType="trash"
                      aria-label={i18n.REMOVE_FRAMEWORK}
                      data-test-subj={`threatMappingRemoveFramework-${id}`}
                      isDisabled={isDisabled}
                      onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                        e.stopPropagation();
                        removeFramework(id);
                      }}
                    />
                  </EuiToolTip>
                }
              >
                <EuiSpacer size="m" />
                {id === 'attack' ? (
                  <UseField
                    path="threat"
                    component={AddMitreAttackThreat}
                    componentProps={{
                      idAria: 'detectionEngineStepAboutRuleMitreThreat',
                      isDisabled,
                      dataTestSubj: 'detectionEngineStepAboutRuleMitreThreat',
                      hideThreatsLabel: true,
                    }}
                  />
                ) : (
                  <UseField
                    path="atlasThreat"
                    defaultValue={atlasThreatDefault}
                    component={AddMitreAtlasThreat}
                    componentProps={{
                      idAria: 'detectionEngineStepAboutRuleMitreAtlasThreat',
                      isDisabled,
                      dataTestSubj: 'detectionEngineStepAboutRuleMitreAtlasThreat',
                      hideThreatsLabel: true,
                    }}
                  />
                )}
              </EuiAccordion>
            </React.Fragment>
          );
        })}

        {availableFrameworks.length > 0 ? (
          <>
            <EuiSpacer size="m" />
            <EuiPopover
              id="threatMappingsAddFrameworkPopover"
              button={
                <MyAddItemButton
                  data-test-subj="threatMappingsAddFramework"
                  onClick={toggleAddPopover}
                  isDisabled={isDisabled}
                >
                  {i18n.ADD_FRAMEWORK}
                </MyAddItemButton>
              }
              isOpen={isAddPopoverOpen}
              closePopover={closeAddPopover}
              panelPaddingSize="none"
              anchorPosition="downLeft"
            >
              <EuiContextMenuPanel size="s" items={addFrameworkItems} />
            </EuiPopover>
          </>
        ) : null}
      </>
    </EuiFormRow>
  );
});

ThreatMappings.displayName = 'ThreatMappings';
