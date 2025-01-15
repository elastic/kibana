/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { Status } from '../../../../../../../../common/types/api';
import {
  ExtractionRule,
  ExtractionRuleBase,
  ExtractionRuleFieldRule,
} from '../../../../../../../../common/types/extraction_rules';
import {
  AddExtractionRuleActions,
  AddExtractionRuleApiLogic,
} from '../../../../../api/crawler/extraction_rules/add_extraction_rule_api_logic';
import {
  DeleteExtractionRuleActions,
  DeleteExtractionRuleApiLogic,
} from '../../../../../api/crawler/extraction_rules/delete_extraction_rule_api_logic';
import {
  FetchExtractionRulesActions,
  FetchExtractionRulesApiLogic,
} from '../../../../../api/crawler/extraction_rules/fetch_extraction_rules_api_logic';
import {
  UpdateExtractionRuleActions,
  UpdateExtractionRuleApiLogic,
} from '../../../../../api/crawler/extraction_rules/update_extraction_rule_api_logic';
import { IndexNameLogic } from '../../../index_name_logic';

import {
  CrawlerDomainDetailActions,
  CrawlerDomainDetailLogic,
  CrawlerDomainDetailValues,
} from '../crawler_domain_detail_logic';

export type ExtractionRuleView = ExtractionRule & { isExpanded: boolean };

interface ExtractionRulesActions {
  addExtractionRule: AddExtractionRuleActions['makeRequest'];
  addExtractionRuleSuccess: AddExtractionRuleActions['apiSuccess'];
  applyDraft: () => void;
  cancelEditExtractionRule: () => void;
  closeEditRuleFlyout: () => void;
  deleteExtractionRule: () => void;
  deleteExtractionRuleRequest: DeleteExtractionRuleActions['makeRequest'];
  deleteExtractionRuleSuccess: DeleteExtractionRuleActions['apiSuccess'];
  deleteFieldRule: () => void;
  editExtractionRule(extractionRule: ExtractionRule): { extractionRule: ExtractionRule };
  editNewExtractionRule: () => void;
  fetchExtractionRules: FetchExtractionRulesActions['makeRequest'];
  fetchExtractionRulesSuccess: FetchExtractionRulesActions['apiSuccess'];
  hideDeleteFieldModal: () => void;
  hideDeleteModal: () => void;
  openEditRuleFlyout({
    fieldRule,
    isNewRule,
  }: {
    fieldRule?: ExtractionRuleFieldRule;
    isNewRule: boolean;
  }): {
    fieldRule: ExtractionRuleFieldRule;
    isNewRule: boolean;
  };
  fetchDomainData: CrawlerDomainDetailActions['fetchDomainData'];
  saveExtractionRule(extractionRule: ExtractionRuleBase): {
    extractionRule: ExtractionRuleBase;
  };
  setLocalExtractionRules(extractionRules: ExtractionRule[]): { extractionRules: ExtractionRule[] };
  showDeleteFieldModal({
    fieldRuleIndex,
    extractionRuleId,
  }: {
    extractionRuleId: string;
    fieldRuleIndex: number;
  }): { extractionRuleId: string; fieldRuleIndex: number };
  showDeleteModal(extractionRule: ExtractionRule): { extractionRule: ExtractionRule };
  updateExtractionRule: UpdateExtractionRuleActions['makeRequest'];
  updateExtractionRuleSuccess: UpdateExtractionRuleActions['apiSuccess'];
}

interface ExtractionRulesValues {
  addStatus: Status;
  deleteFieldModalVisible: boolean;
  deleteModalVisible: boolean;
  deleteStatus: Status;
  domain: CrawlerDomainDetailValues['domain'];
  domainExtractionRules: ExtractionRule[] | null;
  domainId: string;
  editingExtractionRule: boolean;
  extractionRuleToDelete: ExtractionRule | null;
  extractionRuleToEdit: ExtractionRule | null;
  extractionRuleToEditIsNew: boolean;
  extractionRules: ExtractionRule[];
  fieldRuleFlyoutVisible: boolean;
  fieldRuleToDelete: { extractionRuleId?: string; fieldRuleIndex?: number };
  fieldRuleToEdit: ExtractionRuleFieldRule | null;
  fieldRuleToEditIsNew: boolean;
  indexName: string;
  isLoading: boolean;
  isLoadingUpdate: boolean;
  jsonValidationError: boolean;
  updateStatus: Status;
  updatedExtractionRules: ExtractionRule[] | null;
}

export const ExtractionRulesLogic = kea<
  MakeLogicType<ExtractionRulesValues, ExtractionRulesActions>
>({
  actions: {
    cancelEditExtractionRule: true,
    closeEditRuleFlyout: true,
    deleteExtractionRule: true,
    deleteFieldRule: true,
    editExtractionRule: (extractionRule) => ({ extractionRule }),
    editNewExtractionRule: true,
    hideDeleteFieldModal: true,
    hideDeleteModal: true,
    openEditRuleFlyout: ({ fieldRule, isNewRule }) => ({
      fieldRule,
      isNewRule,
    }),
    saveExtractionRule: (extractionRule: ExtractionRuleBase) => ({ extractionRule }),
    showDeleteFieldModal: ({ fieldRuleIndex, extractionRuleId }) => ({
      extractionRuleId,
      fieldRuleIndex,
    }),
    showDeleteModal: (extractionRule: ExtractionRule) => ({ extractionRule }),
  },
  connect: {
    actions: [
      AddExtractionRuleApiLogic,
      ['makeRequest as addExtractionRule', 'apiSuccess as addExtractionRuleSuccess'],
      CrawlerDomainDetailLogic,
      ['receiveDomainData'],
      DeleteExtractionRuleApiLogic,
      ['makeRequest as deleteExtractionRuleRequest', 'apiSuccess as deleteExtractionRuleSuccess'],
      FetchExtractionRulesApiLogic,
      ['makeRequest as fetchExtractionRules', 'apiSuccess as fetchExtractionRulesSuccess'],
      UpdateExtractionRuleApiLogic,
      ['makeRequest as updateExtractionRule', 'apiSuccess as updateExtractionRuleSuccess'],
    ],
    values: [
      AddExtractionRuleApiLogic,
      ['status as addStatus'],
      CrawlerDomainDetailLogic,
      ['domain', 'domainId', 'extractionRules as domainExtractionRules', 'getLoading as isLoading'],
      DeleteExtractionRuleApiLogic,
      ['status as deleteStatus'],
      IndexNameLogic,
      ['indexName'],
      UpdateExtractionRuleApiLogic,
      ['status as updateStatus'],
    ],
  },
  events: ({ actions, values }) => ({
    beforeUnmount: () => {
      // This prevents stale data from hanging around on unload
      actions.fetchDomainData(values.domainId);
    },
  }),
  listeners: ({ actions, values }) => ({
    deleteExtractionRule: () => {
      if (values.extractionRuleToDelete) {
        actions.deleteExtractionRuleRequest({
          domainId: values.domainId,
          extractionRuleId: values.extractionRuleToDelete?.id,
          indexName: values.indexName,
        });
      }
    },
    deleteExtractionRuleSuccess: () => {
      actions.hideDeleteModal();
    },
    deleteFieldRule: () => {
      const { extractionRuleId, fieldRuleIndex } = values.fieldRuleToDelete;
      const extractionRule = values.extractionRules.find(({ id }) => id === extractionRuleId);
      if (extractionRule) {
        const newFieldRules = extractionRule.rules.filter((_, index) => index !== fieldRuleIndex);
        actions.updateExtractionRule({
          domainId: values.domainId,
          indexName: values.indexName,
          rule: { ...extractionRule, rules: newFieldRules },
        });
      }
    },
    saveExtractionRule: ({ extractionRule }) => {
      if (values.extractionRuleToEditIsNew) {
        actions.addExtractionRule({
          domainId: values.domainId,
          indexName: values.indexName,
          rule: extractionRule,
        });
      } else if (values.extractionRuleToEdit) {
        actions.updateExtractionRule({
          domainId: values.domainId,
          indexName: values.indexName,
          rule: { ...values.extractionRuleToEdit, ...extractionRule },
        });
      }
    },
  }),
  path: ['enterprise_search', 'content', 'crawler', 'extraction_rules'],
  reducers: () => ({
    deleteFieldModalVisible: [
      false,
      {
        hideDeleteFieldModal: () => false,
        showDeleteFieldModal: () => true,
        updateExtractionRuleSuccess: () => false,
      },
    ],
    deleteModalVisible: [
      false,
      {
        deleteExtractionRuleSuccess: () => false,
        hideDeleteModal: () => false,
        showDeleteModal: () => true,
      },
    ],
    editingExtractionRule: [
      false,
      {
        addExtractionRuleSuccess: () => false,
        cancelEditExtractionRule: () => false,
        editExtractionRule: () => true,
        editNewExtractionRule: () => true,
        updateExtractionRuleSuccess: () => false,
      },
    ],
    extractionRuleToDelete: [
      null,
      {
        deleteExtractionRuleSuccess: () => null,
        hideDeleteModal: () => null,
        // @ts-expect-error upgrade typescript v5.1.6
        showDeleteModal: (_, { extractionRule }) => extractionRule,
      },
    ],
    extractionRuleToEdit: [
      null,
      {
        addSuccess: () => null,
        cancelEditExtractionRule: () => null,
        // @ts-expect-error upgrade typescript v5.1.6
        editExtractionRule: (_, { extractionRule }) => extractionRule,
        updateSuccess: () => null,
        updateExtractionRuleSuccess: () => null,
      },
    ],
    extractionRuleToEditIsNew: [
      false,
      {
        addSuccess: () => false,
        editNewExtractionRule: () => true,
        editExtractionRule: () => false,
        updateExtractionRuleSuccess: () => false,
      },
    ],
    fieldRuleFlyoutVisible: [
      false,
      {
        addExtractionRuleSuccess: () => false,
        closeEditRuleFlyout: () => false,
        openEditRuleFlyout: () => true,
        updateExtractionRuleSuccess: () => false,
      },
    ],
    fieldRuleToDelete: [
      {},
      {
        hideDeleteFieldModal: () => ({}),
        // @ts-expect-error upgrade typescript v5.1.6
        showDeleteFieldModal: (_, { extractionRuleId, fieldRuleIndex }) => ({
          extractionRuleId,
          fieldRuleIndex,
        }),
        updateExtractionRuleSuccess: () => ({}),
      },
    ],
    fieldRuleToEdit: [
      null,
      {
        closeEditRuleFlyout: () => null,
        // @ts-expect-error upgrade typescript v5.1.6
        openEditRuleFlyout: (_, { fieldRule }) => fieldRule ?? null,
      },
    ],
    fieldRuleToEditIsNew: [
      true,
      {
        closeEditRuleFlyout: () => true,
        // @ts-expect-error upgrade typescript v5.1.6
        openEditRuleFlyout: (_, { isNewRule }) => isNewRule,
      },
    ],
    updatedExtractionRules: [
      null,
      {
        // @ts-expect-error upgrade typescript v5.1.6
        addExtractionRuleSuccess: (_, { extraction_rules: extractionRules }) => extractionRules,
        // @ts-expect-error upgrade typescript v5.1.6
        deleteExtractionRuleSuccess: (_, { extraction_rules: extractionRules }) => extractionRules,
        receiveDomainData: () => null,
        // @ts-expect-error upgrade typescript v5.1.6
        updateExtractionRuleSuccess: (_, { extraction_rules: extractionRules }) => extractionRules,
      },
    ],
  }),
  selectors: ({ selectors }) => ({
    extractionRules: [
      () => [selectors.domainExtractionRules, selectors.updatedExtractionRules],
      (
        domainExtractionRules: ExtractionRule[] | null,
        updatedExtractionRules: ExtractionRule[] | null
      ) => updatedExtractionRules ?? domainExtractionRules ?? [],
    ],
    isLoadingUpdate: [
      () => [selectors.updateStatus, selectors.deleteStatus, selectors.addStatus],
      (updateStatus: Status, deleteStatus: Status, addStatus: Status) =>
        [updateStatus, deleteStatus, addStatus].includes(Status.LOADING),
    ],
  }),
});
