/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { i18n } from '@kbn/i18n';

import { ElasticsearchIndexWithPrivileges } from '../../../../../common/types';
import { flashAPIErrors, flashSuccessToast } from '../../../shared/flash_messages';
import { HttpLogic } from '../../../shared/http';
import { KibanaLogic } from '../../../shared/kibana';
import { formatApiName } from '../../utils/format_api_name';

import { DEFAULT_LANGUAGE, ENGINE_CREATION_SUCCESS_MESSAGE } from './constants';
import { SearchIndexSelectableOption } from './search_index_selectable';
import { getRedirectToAfterEngineCreation, formatIndicesToSelectable } from './utils';

export enum EngineCreationSteps {
  SelectStep = 'Select Engine Type',
  ConfigureStep = 'Configure Engine',
  ReviewStep = 'Review',
}

export type EngineType = 'appSearch' | 'elasticsearch';
interface EngineCreationActions {
  onEngineCreationSuccess(): void;
  setIngestionMethod(method: string): { method: string };
  setLanguage(language: string): { language: string };
  setRawName(rawName: string): { rawName: string };
  setAliasRawName(aliasRawName: string): { aliasRawName: string };
  setCreationStep(creationStep: EngineCreationSteps): EngineCreationSteps;
  submitEngine(): void;
  onSubmitError(): void;
  loadIndices(): void;
  onLoadIndicesSuccess(indices: ElasticsearchIndexWithPrivileges[]): {
    indices: ElasticsearchIndexWithPrivileges[];
  };
  setSelectedIndex(selectedIndexName: string): { selectedIndexName: string };
  setEngineType(engineType: EngineType): { engineType: EngineType };
  setIsAliasAllowed(isAliasAllowed: boolean): { isAliasAllowed: boolean };
  initializeWithESIndex(indexName: string): { indexName: string };
}

interface EngineCreationValues {
  currentEngineCreationStep: EngineCreationSteps;
  ingestionMethod: string;
  isLoading: boolean;
  language: string;
  name: string;
  rawName: string;
  isLoadingIndices: boolean;
  indices: ElasticsearchIndexWithPrivileges[];
  indicesFormatted: SearchIndexSelectableOption[];
  selectedIndex: string;
  selectedIndexFormatted?: SearchIndexSelectableOption;
  engineType: EngineType;
  aliasName: string;
  aliasNameErrorMessage: string;
  aliasRawName: string;
  showAliasNameErrorMessages: boolean;
  isAliasAllowed: boolean;
  isAliasRequired: boolean;
  isSubmitDisabled: boolean;
}

export const EngineCreationLogic = kea<MakeLogicType<EngineCreationValues, EngineCreationActions>>({
  path: ['enterprise_search', 'app_search', 'engine_creation_logic'],
  actions: {
    onEngineCreationSuccess: true,
    setIngestionMethod: (method) => ({ method }),
    setLanguage: (language) => ({ language }),
    setRawName: (rawName) => ({ rawName }),
    setAliasRawName: (aliasRawName) => ({ aliasRawName }),
    submitEngine: true,
    onSubmitError: true,
    loadIndices: true,
    onLoadIndicesSuccess: (indices) => ({ indices }),
    setSelectedIndex: (selectedIndexName) => ({ selectedIndexName }),
    setEngineType: (engineType) => ({ engineType }),
    setCreationStep: (currentEngineCreationStep) => currentEngineCreationStep,
    setIsAliasAllowed: (isAliasAllowed) => ({ isAliasAllowed }),
    initializeWithESIndex: (indexName) => ({ indexName }),
  },
  reducers: {
    ingestionMethod: [
      '',
      {
        setIngestionMethod: (_, { method }) => method,
      },
    ],
    isLoading: [
      false,
      {
        submitEngine: () => true,
        onSubmitError: () => false,
      },
    ],
    language: [
      DEFAULT_LANGUAGE,
      {
        setLanguage: (_, { language }) => language,
      },
    ],
    rawName: [
      '',
      {
        setRawName: (_, { rawName }) => rawName,
      },
    ],
    aliasRawName: [
      '',
      {
        setAliasRawName: (_, { aliasRawName }) => aliasRawName,
        setSelectedIndex: (_, { selectedIndexName }) => {
          return selectedIndexName.length === 0 || selectedIndexName.startsWith('search-')
            ? ''
            : `search-${selectedIndexName}-alias`;
        },
        initializeWithESIndex: (_, { indexName }) =>
          indexName.length === 0 || indexName.startsWith('search-')
            ? ''
            : `search-${indexName}-alias`,
      },
    ],
    isAliasAllowed: [
      true,
      {
        setIsAliasAllowed: (_, { isAliasAllowed }) => isAliasAllowed,
      },
    ],
    isLoadingIndices: [
      false,
      {
        loadIndices: () => true,
        onLoadIndicesSuccess: () => false,
        onSubmitError: () => false,
      },
    ],
    indices: [
      [],
      {
        onLoadIndicesSuccess: (_, { indices }) => indices,
      },
    ],
    selectedIndex: [
      '',
      {
        setSelectedIndex: (_, { selectedIndexName }) => selectedIndexName,
        onSubmitError: () => '',
        initializeWithESIndex: (_, { indexName }) => indexName,
      },
    ],
    engineType: [
      'appSearch',
      {
        setEngineType: (_, { engineType }) => engineType,
        initializeWithESIndex: () => 'elasticsearch',
      },
    ],
    currentEngineCreationStep: [
      EngineCreationSteps.SelectStep,
      {
        setCreationStep: (_, currentEngineCreationStep) => currentEngineCreationStep,
        initializeWithESIndex: () => EngineCreationSteps.ConfigureStep,
      },
    ],
  },
  selectors: ({ selectors }) => ({
    name: [() => [selectors.rawName], (rawName) => formatApiName(rawName)],
    aliasName: [() => [selectors.aliasRawName], (aliasRawName) => formatApiName(aliasRawName)],
    indicesFormatted: [
      () => [selectors.indices, selectors.selectedIndex],
      (indices: ElasticsearchIndexWithPrivileges[], selectedIndexName) =>
        formatIndicesToSelectable(indices, selectedIndexName),
    ],
    isSubmitDisabled: [
      () => [
        selectors.name,
        selectors.engineType,
        selectors.selectedIndex,
        selectors.aliasName,
        selectors.showAliasNameErrorMessages,
      ],
      (
        name: string,
        engineType: EngineType,
        selectedIndex: string,
        aliasName: string,
        showAliasNameErrorMessages: boolean
      ) => {
        if (name.length === 0 || showAliasNameErrorMessages) {
          return true;
        }

        if (engineType === 'elasticsearch') {
          if (selectedIndex.length === 0) {
            return true;
          }

          if (aliasName.length === 0) {
            return !selectedIndex.startsWith('search-');
          } else {
            return !aliasName.startsWith('search-');
          }
        }

        return false;
      },
    ],
    isAliasRequired: [
      () => [selectors.selectedIndex],
      (selectedIndex: string) => selectedIndex.length > 0 && !selectedIndex?.startsWith('search-'),
    ],
    selectedIndexFormatted: [
      () => [selectors.selectedIndex, selectors.indicesFormatted],
      (selectedIndex: string, indicesFormatted: SearchIndexSelectableOption[]) => {
        return indicesFormatted.find((el) => el.label === selectedIndex);
      },
    ],
    aliasNameErrorMessage: [
      () => [selectors.aliasName, selectors.indices],
      (aliasName: string, indices: ElasticsearchIndexWithPrivileges[]) => {
        const existingAlias = indices.find((el) => el.name === aliasName);
        if (existingAlias) {
          return i18n.translate(
            'xpack.enterpriseSearch.appSearch.engineCreation.configureForm.aliasName.errorText',
            {
              // ugly, but cannot use dedent here and pass Kibana's Checks
              defaultMessage: `
There is an existing index or alias with the name {aliasName}.
Please choose another alias name.
`,
              values: { aliasName },
            }
          );
        } else {
          return '';
        }
      },
    ],
    showAliasNameErrorMessages: [
      () => [selectors.aliasNameErrorMessage],
      (aliasNameErrorMessage: string) => aliasNameErrorMessage.length > 0,
    ],
  }),
  listeners: ({ values, actions }) => ({
    submitEngine: async () => {
      const { http } = HttpLogic.values;
      const { name, language, engineType, selectedIndex, aliasName } = values;

      try {
        if (engineType === 'appSearch') {
          const body = JSON.stringify({ name, language });

          await http.post('/internal/app_search/engines', { body });
        } else {
          const body = JSON.stringify({
            name,
            search_index: {
              type: 'elasticsearch',
              index_name: selectedIndex,
              ...(aliasName.length === 0 ? {} : { alias_name: aliasName }),
            },
          });
          await http.post('/internal/app_search/elasticsearch/engines', { body });
        }
        actions.onEngineCreationSuccess();
      } catch (e) {
        flashAPIErrors(e);
        actions.onSubmitError();
      }
    },
    onEngineCreationSuccess: () => {
      const { ingestionMethod, name } = values;
      const { navigateToUrl } = KibanaLogic.values;
      const toUrl = getRedirectToAfterEngineCreation({ ingestionMethod, engineName: name });

      flashSuccessToast(ENGINE_CREATION_SUCCESS_MESSAGE(name));
      navigateToUrl(toUrl);
    },
    loadIndices: async () => {
      const { http } = HttpLogic.values;
      try {
        const indices = await http.get('/internal/enterprise_search/search_indices');
        actions.onLoadIndicesSuccess(indices as ElasticsearchIndexWithPrivileges[]);
      } catch (e) {
        flashAPIErrors(e);
        actions.onSubmitError();
      }
    },
  }),
});
