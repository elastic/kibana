/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiSelect,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { docLinks } from '../../../../../shared/doc_links';
import { clearFlashMessages } from '../../../../../shared/flash_messages';
import { InlineEditableTable } from '../../../../../shared/tables/inline_editable_table/inline_editable_table';
import { InlineEditableTableColumn } from '../../../../../shared/tables/inline_editable_table/types';

import { SourceLogic } from '../../source_logic';

import { EditableIndexingRule, SynchronizationLogic } from './synchronization_logic';

const SOURCE_ASSETS_AND_OBJECTS_OBJECTS_TABLE_POLICY_LABEL = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.sources.sourceAssetsAndObjectsObjectsTablePolicyLabel',
  {
    defaultMessage: 'Policy',
  }
);

const SOURCE_ASSETS_AND_OBJECTS_OBJECTS_TABLE_PATH_LABEL = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.sources.sourceAssetsAndObjectsObjectsTablePathLabel',
  {
    defaultMessage: 'Path',
  }
);

export const SOURCE_ASSETS_AND_OBJECTS_OBJECTS_TABLE_ITEM_LABEL = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.sources.sourceAssetsAndObjectsObjectsTableItemLabel',
  {
    defaultMessage: 'Item',
  }
);

export const SOURCE_ASSETS_AND_OBJECTS_OBJECTS_TABLE_FILE_LABEL = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.sources.sourceAssetsAndObjectsObjectsTableFileLabel',
  {
    defaultMessage: 'File type',
  }
);

export const SOURCE_ASSETS_AND_OBJECTS_OBJECTS_TABLE_INCLUDE_LABEL = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.sources.sourceAssetsAndObjectsObjectsTableIncludeLabel',
  {
    defaultMessage: 'Include',
  }
);

export const SOURCE_ASSETS_AND_OBJECTS_OBJECTS_TABLE_EXCLUDE_LABEL = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.sources.sourceAssetsAndObjectsObjectsTableExcludeLabel',
  {
    defaultMessage: 'Exclude',
  }
);

export const IndexingRulesTable: React.FC = () => {
  const { contentSource } = useValues(SourceLogic);
  const indexingRulesInstanceId = 'IndexingRulesTable';
  const { indexingRules } = useValues(
    SynchronizationLogic({ contentSource, indexingRulesInstanceId })
  );
  const { initAddIndexingRule, deleteIndexingRule, initSetIndexingRule, setIndexingRules } =
    useActions(SynchronizationLogic({ contentSource }));

  const description = (
    <EuiText size="s" color="default">
      {i18n.translate(
        'xpack.enterpriseSearch.workplaceSearch.sources.sourceAssetsAndObjectsObjectsDescription',
        {
          defaultMessage:
            'Add an indexing rule to customize what data is synchronized from {contentSourceName}. Everything is included by default, and documents are validated against the configured set of indexing rules starting from the top listed down.',
          values: { contentSourceName: contentSource.name },
        }
      )}
      <EuiSpacer />
      <EuiLink href={docLinks.workplaceSearchSynch} external>
        {i18n.translate(
          'xpack.enterpriseSearch.workplaceSearch.sources.sourceAssetsAndObjectsSyncLearnMoreLink',
          {
            defaultMessage: 'Learn more about customizing your index rules.',
          }
        )}
      </EuiLink>
    </EuiText>
  );

  const valueTypeToString = (input: string): string => {
    switch (input) {
      case 'include':
        return SOURCE_ASSETS_AND_OBJECTS_OBJECTS_TABLE_INCLUDE_LABEL;
      case 'exclude':
        return SOURCE_ASSETS_AND_OBJECTS_OBJECTS_TABLE_EXCLUDE_LABEL;
      default:
        return '';
    }
  };

  const filterTypeToString = (input: string): string => {
    switch (input) {
      case 'object_type':
        return SOURCE_ASSETS_AND_OBJECTS_OBJECTS_TABLE_ITEM_LABEL;
      case 'path_template':
        return SOURCE_ASSETS_AND_OBJECTS_OBJECTS_TABLE_PATH_LABEL;
      case 'file_extension':
        return SOURCE_ASSETS_AND_OBJECTS_OBJECTS_TABLE_FILE_LABEL;
      default:
        return '';
    }
  };

  const columns: Array<InlineEditableTableColumn<EditableIndexingRule>> = [
    {
      editingRender: (indexingRule, onChange, { isInvalid, isLoading }) => (
        <EuiSelect
          fullWidth
          value={indexingRule.valueType}
          onChange={(e) => onChange(e.target.value)}
          disabled={isLoading}
          isInvalid={isInvalid}
          options={[
            { text: SOURCE_ASSETS_AND_OBJECTS_OBJECTS_TABLE_INCLUDE_LABEL, value: 'include' },
            { text: SOURCE_ASSETS_AND_OBJECTS_OBJECTS_TABLE_EXCLUDE_LABEL, value: 'exclude' },
          ]}
        />
      ),
      render: (indexingRule) => (
        <EuiText size="s">{valueTypeToString(indexingRule.valueType)}</EuiText>
      ),
      name: SOURCE_ASSETS_AND_OBJECTS_OBJECTS_TABLE_POLICY_LABEL,
      field: 'valueType',
    },
    {
      editingRender: (indexingRule, onChange, { isInvalid, isLoading }) => (
        <EuiSelect
          fullWidth
          value={indexingRule.filterType}
          onChange={(e) => onChange(e.target.value)}
          disabled={isLoading}
          isInvalid={isInvalid}
          options={[
            { text: SOURCE_ASSETS_AND_OBJECTS_OBJECTS_TABLE_ITEM_LABEL, value: 'object_type' },
            { text: SOURCE_ASSETS_AND_OBJECTS_OBJECTS_TABLE_PATH_LABEL, value: 'path_template' },
            { text: SOURCE_ASSETS_AND_OBJECTS_OBJECTS_TABLE_FILE_LABEL, value: 'file_extension' },
          ]}
        />
      ),
      render: (indexingRule) => (
        <EuiText size="s">{filterTypeToString(indexingRule.filterType)}</EuiText>
      ),
      name: i18n.translate(
        'xpack.enterpriseSearch.workplaceSearch.sources.sourceAssetsAndObjectsObjectsTableRuleLabel',
        {
          defaultMessage: 'Rule',
        }
      ),
      field: 'filterType',
    },
    {
      editingRender: (indexingRule, onChange, { isInvalid, isLoading }) => (
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem>
            <EuiFieldText
              fullWidth
              value={indexingRule.value}
              onChange={(e) => onChange(e.target.value)}
              disabled={isLoading}
              isInvalid={isInvalid}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
      render: (indexingRule) => <EuiText size="s">{indexingRule.value}</EuiText>,
      name: i18n.translate(
        'xpack.enterpriseSearch.workplaceSearch.sources.sourceAssetsAndObjectsObjectsTableValueLabel',
        {
          defaultMessage: 'Value',
        }
      ),
      field: 'value',
    },
  ];

  return (
    <InlineEditableTable
      addButtonText={i18n.translate(
        'xpack.enterpriseSearch.workplaceSearch.sources.sourceAssetsAndObjectsAddRuleLabel',
        { defaultMessage: 'Add indexing rule' }
      )}
      columns={columns}
      defaultItem={{
        valueType: 'include',
        filterType: 'object_type',
      }}
      description={description}
      instanceId={indexingRulesInstanceId}
      items={indexingRules}
      onAdd={(newRule) => {
        initAddIndexingRule(newRule);
        clearFlashMessages();
      }}
      onDelete={(rule) => {
        deleteIndexingRule(rule);
        clearFlashMessages();
      }}
      onUpdate={(rule) => {
        initSetIndexingRule(rule);
        clearFlashMessages();
      }}
      onReorder={(newIndexingRules) => {
        setIndexingRules(newIndexingRules);
        clearFlashMessages();
      }}
      title=""
      bottomRows={[
        <EuiText size="s">
          {i18n.translate(
            'xpack.enterpriseSearch.workplaceSearch.sources.indexingRulesTable.includeEverythingMessage',
            {
              defaultMessage: 'Include everything else from this source',
            }
          )}
        </EuiText>,
      ]}
      canRemoveLastItem
      showRowIndex
    />
  );
};
