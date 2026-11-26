/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { usePerformAllRulesInstallMutation } from '../../../rule_management/api/hooks/prebuilt_rules/use_perform_all_rules_install_mutation';
import { usePerformSpecificRulesInstallMutation } from '../../../rule_management/api/hooks/prebuilt_rules/use_perform_specific_rules_install_mutation';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import type { PerformRuleInstallationResponseBody } from '../../../../../common/api/detection_engine/prebuilt_rules';
import type { LibraryRuleRow } from './types';

export type LibraryRuleReference = Pick<LibraryRuleRow, 'ruleId' | 'version' | 'libraryId'>;
import * as i18n from './translations';

export const useInstallLibraryRules = () => {
  const { addError, addSuccess } = useAppToasts();

  const reportError = useCallback(
    (error: unknown) => addError(error, { title: i18n.INSTALL_ERROR_TITLE }),
    [addError]
  );
  const reportResult = useCallback(
    ({ summary, errors }: PerformRuleInstallationResponseBody) => {
      if (summary.failed > 0) {
        reportError(new Error(errors.map(({ message }) => message).join('\n')));
      } else {
        addSuccess(i18n.INSTALL_SUCCESS(summary.succeeded));
      }
    },
    [addSuccess, reportError]
  );

  const { mutate: installSpecific, isLoading: isInstallingSpecific } =
    usePerformSpecificRulesInstallMutation({ onError: reportError, onSuccess: reportResult });
  const { mutate: installEvery, isLoading: isInstallingAll } = usePerformAllRulesInstallMutation({
    onError: reportError,
    onSuccess: reportResult,
  });

  const install = useCallback(
    (rules: readonly LibraryRuleReference[], enable?: boolean) =>
      installSpecific({
        rules: rules.map(({ ruleId, version, libraryId }) => ({
          rule_id: ruleId,
          version,
          library_id: libraryId,
        })),
        enable,
      }),
    [installSpecific]
  );

  // Installs every rule of the library that is not installed yet.
  const installAll = useCallback(
    (libraryId: string) => installEvery({ libraryId }),
    [installEvery]
  );

  return { install, installAll, isInstalling: isInstallingSpecific || isInstallingAll };
};
