/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { EuiComboBox, EuiFormRow } from '@elastic/eui';
import type { FieldValues, Path, PathValue } from 'react-hook-form';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { useSelector } from 'react-redux';
import usePrevious from 'react-use/lib/usePrevious';
import { selectAgentPolicies } from '../../../state/agent_policies';
import type { ClientPluginsStart } from '../../../../../plugin';

interface SpaceSelectorProps {
  helpText: string;
  isDisabled?: boolean;
}

export const SpaceSelector = <T extends FieldValues>({
  helpText,
  isDisabled = false,
}: SpaceSelectorProps) => {
  const NAMESPACES_NAME = 'spaces' as Path<T>;
  const { services } = useKibana<ClientPluginsStart>();
  const [spacesList, setSpacesList] = React.useState<Array<{ id: string; label: string }>>([]);
  const data = services.spaces?.ui.useSpaces();
  const AGENT_POLICY_FIELD_NAME = 'agentPolicyId' as Path<T>;
  const { data: agentPolicies } = useSelector(selectAgentPolicies);

  const { control, trigger, setValue } = useFormContext<T>();

  const selectedAgentPolicyId: string = useWatch({
    control,
    name: AGENT_POLICY_FIELD_NAME,
  });

  const prevAgentPolicyId = usePrevious(selectedAgentPolicyId);

  useEffect(() => {
    if (
      selectedAgentPolicyId !== prevAgentPolicyId &&
      selectedAgentPolicyId &&
      agentPolicies &&
      data?.spacesDataPromise
    ) {
      if (isDisabled) return;
      const selectedPolicy = agentPolicies.find((policy) => policy.id === selectedAgentPolicyId);
      if (!selectedPolicy) {
        throw new Error('Selected agent policy not found, this should never happen');
      }
      const policySpaceIds = selectedPolicy.spaceIds || [];

      data.spacesDataPromise.then((spacesData) => {
        const spacesArray = Array.from(spacesData.spacesMap);
        const formattedSpaces = spacesArray.flatMap(([spaceId, spaceData]) => {
          if (!selectedPolicy.spaceIds) {
            policySpaceIds.push(spaceId);
            return [{ id: spaceId, label: spaceData.name }];
          }
          return selectedPolicy.spaceIds.includes(spaceId)
            ? [
                {
                  id: spaceId,
                  label: spaceData.name,
                },
              ]
            : [];
        });
        setSpacesList(formattedSpaces);
        setValue(NAMESPACES_NAME, policySpaceIds as PathValue<T, Path<T>>);
      });
    }
  }, [
    agentPolicies,
    data?.spacesDataPromise,
    isDisabled,
    prevAgentPolicyId,
    selectedAgentPolicyId,
    setValue,
  ]);

  return (
    <EuiFormRow fullWidth label={SPACES_LABEL} helpText={helpText}>
      <Controller
        name={NAMESPACES_NAME}
        control={control}
        render={({ field }) => (
          <EuiComboBox
            isDisabled={isDisabled}
            fullWidth
            aria-label={SPACES_LABEL}
            placeholder={SPACES_LABEL}
            {...field}
            onBlur={async () => {
              await trigger();
            }}
            options={spacesList}
            selectedOptions={(field.value ?? []).map((id) => {
              const sp = spacesList.find((space) => space.id === id);
              if (!sp) {
                return {
                  id,
                  label: id,
                };
              }
              return { id: sp.id, label: sp.label };
            })}
            isClearable={true}
            onChange={(selected) => {
              const selectedIds = selected.map((option) => option.id);
              field.onChange(selectedIds);
            }}
          />
        )}
      />
    </EuiFormRow>
  );
};

const SPACES_LABEL = i18n.translate('xpack.synthetics.privateLocation.spacesLabel', {
  defaultMessage: 'Spaces ',
});
