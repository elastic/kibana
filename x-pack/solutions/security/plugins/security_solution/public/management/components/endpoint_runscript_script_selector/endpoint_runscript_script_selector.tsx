/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo } from 'react';
import type { EuiSuperSelectOption, EuiSuperSelectProps } from '@elastic/eui';
import { EuiSuperSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { EndpointScript } from '../../../../common/endpoint/types';
import { useGetCustomScripts } from '../../hooks/custom_scripts/use_get_custom_scripts';
import { useTestIdGenerator } from '../../hooks/use_test_id_generator';
import { useUserPrivileges } from '../../../common/components/user_privileges';
import type { CustomScriptsRequestQueryParams } from '../../../../common/api/endpoint/custom_scripts/get_custom_scripts_route';

export interface EndpointRunscriptScriptSelectorProps {
  selectedScriptId: string | undefined;
  onChange: (script: EndpointScript | undefined) => void;
  'data-test-subj'?: string;
  osType?: CustomScriptsRequestQueryParams['osType'];
}

/**
 * Script selector form component specific for Elastic Defend `runscript` response action. It uses
 * the internal API rather than the public scripts library API to retrieve the list of scripts, thus
 * users must have the authz to execute runscript to be able to use this component.
 */
export const EndpointRunscriptScriptSelector = memo<EndpointRunscriptScriptSelectorProps>(
  ({ osType, selectedScriptId, onChange, 'data-test-subj': dataTestSubj }) => {
    const hasAuthz = useUserPrivileges().endpointPrivileges.canWriteExecuteOperations;
    const getTestId = useTestIdGenerator(dataTestSubj);
    const { data, isLoading, error } = useGetCustomScripts<EndpointScript>(
      'endpoint',
      { osType },
      { enabled: hasAuthz }
    );

    const selectedScript: EndpointScript | undefined = useMemo(() => {
      if (selectedScriptId && data) {
        return data.find((script) => script.id === selectedScriptId)?.meta ?? undefined;
      }
    }, [data, selectedScriptId]);

    const scriptOptions: EuiSuperSelectOption<EndpointScript>[] = useMemo(() => {
      if (!data?.length) {
        return [];
      }

      return data.map<EuiSuperSelectOption<EndpointScript>>((script) => {
        return {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          value: script.meta!,
          inputDisplay: script.name,
          dropdownDisplay: script.name,
        };
      });
    }, [data]);

    const handleScriptSelectorOnChange: EuiSuperSelectProps<EndpointScript>['onChange'] =
      useCallback(
        (script) => {
          onChange(script);
        },
        [onChange]
      );

    if (!hasAuthz) {
      return null;
    }

    return (
      <EuiSuperSelect<EndpointScript>
        options={scriptOptions}
        data-test-subj={getTestId()}
        valueOfSelected={selectedScript}
        fullWidth
        isLoading={isLoading}
        onChange={handleScriptSelectorOnChange}
        aria-label={i18n.translate(
          'xpack.securitySolution.endpointRunscriptScriptSelector.selectorLabel',
          { defaultMessage: 'Select a script' }
        )}
      />
    );
  }
);
EndpointRunscriptScriptSelector.displayName = 'EndpointRunscriptScriptSelector';
