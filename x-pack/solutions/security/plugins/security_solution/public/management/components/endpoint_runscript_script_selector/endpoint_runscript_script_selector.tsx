/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { EuiSuperSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useTestIdGenerator } from '../../hooks/use_test_id_generator';
import { useUserPrivileges } from '../../../common/components/user_privileges';

export interface EndpointRunscriptScriptSelectorProps {
  'data-test-subj'?: string;
}

/**
 * Script selector form component specific for Elastic Defend `runscript` response action. It uses
 * the internal API rather than the puclic scripts library API to retrieve the list of scripts, thus
 * users must have the authz to execute runscript to be able to use this component.
 */
export const EndpointRunscriptScriptSelector = memo<EndpointRunscriptScriptSelectorProps>(
  ({ 'data-test-subj': dataTestSubj }) => {
    const hasAuthz = useUserPrivileges().endpointPrivileges.canWriteExecuteOperations;
    const getTestId = useTestIdGenerator(dataTestSubj);

    const scriptOptions = useMemo(() => {
      // TODO:PT implement useMemo()
      return [];
    }, []);

    if (!hasAuthz) {
      return null;
    }

    return (
      <EuiSuperSelect
        options={scriptOptions}
        data-test-subj={getTestId()}
        fullWidth
        aria-label={i18n.translate(
          'xpack.securitySolution.endpointRunscriptScriptSelector.selectorLabel',
          { defaultMessage: 'Select a script' }
        )}
      />
    );
  }
);
EndpointRunscriptScriptSelector.displayName = 'EndpointRunscriptScriptSelector';
