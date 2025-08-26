/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { EuiCheckbox, EuiSpacer } from '@elastic/eui';
import type {
  ImportRulesResponse,
  WarningSchema,
} from '../../../../../common/api/detection_engine';
import { importRules } from '../../../rule_management/logic';
import { showToast } from './utils';
import { ActionConnectorWarnings } from './action_connectors_warning';
import { ImportDataModal } from '../../../../common/components/import_data_modal';
import { useInvalidateFindRulesQuery } from '../../../rule_management/api/hooks/use_find_rules_query';
import { useInvalidateFetchCoverageOverviewQuery } from '../../../rule_management/api/hooks/use_fetch_coverage_overview_query';
import { useInvalidateFetchRuleManagementFiltersQuery } from '../../../rule_management/api/hooks/use_fetch_rule_management_filters_query';
import { useToasts } from '../../../../common/lib/kibana';
import * as i18nCommon from '../../../common/translations';
import * as i18n from './translations';
import { useInvalidateFetchPrebuiltRuleBaseVersionQuery } from '../../../rule_management/api/hooks/prebuilt_rules/use_fetch_prebuilt_rule_base_version_query';

interface RuleImportModalProps {
  isImportModalVisible: boolean;
  hideImportModal: () => void;
}

export function RuleImportModal({ isImportModalVisible, hideImportModal }: RuleImportModalProps) {
  const toasts = useToasts();

  const [overwrite, setOverwrite] = useState(false);
  const [overwriteExceptions, setOverwriteExceptions] = useState(false);
  const [overwriteActionConnectors, setOverwriteActionConnectors] = useState(false);

  const [actionConnectorsWarnings, setActionConnectorsWarnings] = useState<WarningSchema[] | []>(
    []
  );
  const [importedActionConnectorsCount, setImportedActionConnectorsCount] = useState<
    number | undefined
  >(0);

  const invalidateFindRulesQuery = useInvalidateFindRulesQuery();
  const invalidateFetchCoverageOverviewQuery = useInvalidateFetchCoverageOverviewQuery();
  const invalidateFetchRuleManagementFilters = useInvalidateFetchRuleManagementFiltersQuery();
  const invalidateFetchPrebuiltRuleBaseVerison = useInvalidateFetchPrebuiltRuleBaseVersionQuery();
  const invalidateRules = useCallback(() => {
    invalidateFindRulesQuery();
    invalidateFetchRuleManagementFilters();
    invalidateFetchCoverageOverviewQuery();
    invalidateFetchPrebuiltRuleBaseVerison();
  }, [
    invalidateFindRulesQuery,
    invalidateFetchRuleManagementFilters,
    invalidateFetchCoverageOverviewQuery,
    invalidateFetchPrebuiltRuleBaseVerison,
  ]);

  const handleModalClose = useCallback(() => {
    hideImportModal();
    setOverwrite(false);
    setOverwriteExceptions(false);
    setOverwriteActionConnectors(false);
    setActionConnectorsWarnings([]);
  }, [hideImportModal]);

  const handleImportComplete = useCallback(
    (importResponse: ImportRulesResponse) => {
      showToast({
        importResponse,
        toasts,
      });

      invalidateRules();

      if (!importResponse.action_connectors_warnings.length) {
        handleModalClose();
      }
    },
    [toasts, handleModalClose, invalidateRules]
  );

  const handleRuleImport = useCallback(
    async ({ fileToImport, signal }: { fileToImport: File; signal: AbortSignal }) => {
      const importResponse = await importRules({
        fileToImport,
        signal,
        overwrite,
        overwriteExceptions,
        overwriteActionConnectors,
      });

      const connectorsCount = importResponse.action_connectors_success_count;
      setActionConnectorsWarnings(importResponse.action_connectors_warnings as WarningSchema[]);
      setImportedActionConnectorsCount(connectorsCount);

      return importResponse;
    },
    [overwrite, overwriteActionConnectors, overwriteExceptions]
  );

  const handleCheckboxClick = useCallback(() => {
    setOverwrite((shouldOverwrite) => !shouldOverwrite);
  }, []);

  const handleExceptionsCheckboxClick = useCallback(() => {
    setOverwriteExceptions((shouldOverwrite) => !shouldOverwrite);
  }, []);

  const handleActionConnectorsCheckboxClick = useCallback(() => {
    setOverwriteActionConnectors((shouldOverwrite) => !shouldOverwrite);
  }, []);

  return (
    <ImportDataModal
      isModalVisible={isImportModalVisible}
      closeModal={handleModalClose}
      title={i18nCommon.IMPORT_RULE}
      filePickerPrompt={i18n.INITIAL_PROMPT_TEXT}
      description={i18n.SELECT_RULE}
      submitBtnText={i18n.IMPORT_RULE_BTN_TITLE}
      errorMessage={i18n.RULE_IMPORT_FAILED}
      importData={handleRuleImport}
      onImportComplete={handleImportComplete}
    >
      <>
        <ActionConnectorWarnings
          actionConnectorsWarnings={actionConnectorsWarnings}
          importedActionConnectorsCount={importedActionConnectorsCount}
        />

        <EuiSpacer size="s" />

        <EuiCheckbox
          data-test-subj="importDataModalCheckboxLabel"
          id="importDataModalCheckboxLabel"
          label={i18n.OVERWRITE_WITH_SAME_NAME}
          checked={overwrite}
          onChange={handleCheckboxClick}
        />
        <EuiCheckbox
          data-test-subj="importDataModalExceptionsCheckboxLabel"
          id="importDataModalExceptionsCheckboxLabel"
          label={i18n.OVERWRITE_EXCEPTIONS_LABEL}
          checked={overwriteExceptions}
          onChange={handleExceptionsCheckboxClick}
        />
        <EuiCheckbox
          data-test-subj="importDataModalActionConnectorsCheckbox"
          id="importDataModalActionConnectorsCheckbox"
          label={i18n.OVERWRITE_ACTION_CONNECTORS_LABEL}
          checked={overwriteActionConnectors}
          onChange={handleActionConnectorsCheckboxClick}
        />
      </>
    </ImportDataModal>
  );
}
