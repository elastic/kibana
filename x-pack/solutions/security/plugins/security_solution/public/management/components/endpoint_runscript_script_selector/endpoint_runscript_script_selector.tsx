/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useEffect, useMemo } from 'react';
import type { EuiSuperSelectOption, EuiSuperSelectProps } from '@elastic/eui';
import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiSuperSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { EndpointScript } from '../../../../common/endpoint/types';
import { useGetCustomScripts } from '../../hooks/custom_scripts/use_get_custom_scripts';
import { useTestIdGenerator } from '../../hooks/use_test_id_generator';
import { useUserPrivileges } from '../../../common/components/user_privileges';
import type { CustomScriptsRequestQueryParams } from '../../../../common/api/endpoint/custom_scripts/get_custom_scripts_route';

const CLEAR_SELECTION_LABEL = i18n.translate(
  'xpack.securitySolution.endpointRunscriptScriptSelector.clearSelection',
  { defaultMessage: 'Clear selection' }
);
const SELECT_INPUT_PLACEHOLDER = i18n.translate(
  'xpack.securitySolution.endpointRunscriptScriptSelector.placeholder',
  { defaultMessage: 'Select a script' }
);

export interface EndpointRunscriptScriptSelectorProps {
  selectedScriptId: string | undefined;
  onChange: (script: EndpointScript | undefined) => void;
  /**
   * Called with the loaded scripts everytime they are fetched. This is a convenience prop that
   * allows consumers of this component to access the list of scripts loaded into memory.
   */
  onScriptsLoaded?: (scripts: EndpointScript[]) => void;
  'data-test-subj'?: string;
  osType?: CustomScriptsRequestQueryParams['osType'];
}

/**
 * Script selector form component specific for Elastic Defend `runscript` response action. It uses
 * the internal API rather than the public scripts library API to retrieve the list of scripts, thus
 * users must have the authz to execute runscript to be able to use this component.
 */
export const EndpointRunscriptScriptSelector = memo<EndpointRunscriptScriptSelectorProps>(
  ({ osType, selectedScriptId, onChange, onScriptsLoaded, 'data-test-subj': dataTestSubj }) => {
    const hasAuthz = useUserPrivileges().endpointPrivileges.canWriteExecuteOperations;
    const getTestId = useTestIdGenerator(dataTestSubj);
    const { data, isLoading, isFetched, error } = useGetCustomScripts<EndpointScript>(
      'endpoint',
      { osType },
      {
        enabled: hasAuthz,
        onSuccess: (loadedScripts) => {
          if (onScriptsLoaded) {
            // For Endpoint the `meta` will always be populated
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            onScriptsLoaded(loadedScripts.map((script) => script.meta!));
          }
        },
      }
    );

    const displayError = useMemo(() => {
      if (error) {
        return error.message;
      }

      if (isFetched && data?.length === 0) {
        return i18n.translate(
          'xpack.securitySolution.endpointRunscriptScriptSelector.noScriptsFound',
          { defaultMessage: 'No scripts found' }
        );
      }
    }, [data?.length, error, isFetched]);

    const clearCurrentSelectionHandler = useCallback(
      (ev: React.MouseEvent) => {
        onChange(undefined);
        ev.stopPropagation();
      },
      [onChange]
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
          inputDisplay: (
            <EuiFlexGroup responsive={false} wrap={false} gutterSize="xs" alignItems="center">
              <EuiFlexItem>{script.name}</EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonIcon
                  iconType="crossInCircle"
                  color="text"
                  display="empty"
                  onClick={clearCurrentSelectionHandler}
                  aria-label={CLEAR_SELECTION_LABEL}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          ),
          dropdownDisplay: script.name,
        };
      });
    }, [clearCurrentSelectionHandler, data]);

    const handleScriptSelectorOnChange = useCallback<
      Required<EuiSuperSelectProps<EndpointScript>>['onChange']
    >(
      (script) => {
        // if user clicked on the same script name, then unselect it
        if (script.id === selectedScriptId) {
          onChange(undefined);
          return;
        }

        onChange(script);
      },
      [onChange, selectedScriptId]
    );

    useEffect(() => {
      // If scripts were loaded and we can't find the selected script, then emit change (script could have been deleted)
      if ((data || error) && !selectedScript && selectedScriptId) {
        onChange(undefined);
      }
    }, [data, error, onChange, selectedScript, selectedScriptId]);

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
        isInvalid={!!displayError}
        placeholder={displayError ? displayError : SELECT_INPUT_PLACEHOLDER}
        onChange={handleScriptSelectorOnChange}
        aria-label={SELECT_INPUT_PLACEHOLDER}
      />
    );
  }
);
EndpointRunscriptScriptSelector.displayName = 'EndpointRunscriptScriptSelector';
