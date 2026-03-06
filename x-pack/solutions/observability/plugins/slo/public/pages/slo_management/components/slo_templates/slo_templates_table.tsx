/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Criteria, DefaultItemAction, EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiBadge,
  EuiBasicTable,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { SLOTemplateResponse } from '@kbn/slo-schema';
import { paths } from '@kbn/slo-shared-plugin/common/locators/paths';
import React from 'react';
import { useFetchSloTemplates } from '../../../../hooks/use_fetch_slo_templates';
import { useKibana } from '../../../../hooks/use_kibana';
import { usePermissions } from '../../../../hooks/use_permissions';
import type { TemplatesSearchState } from '../../hooks/use_templates_url_search_state';
import { SloTemplatesSearchBar } from './slo_templates_search_bar';

interface Props {
  state: TemplatesSearchState;
  onStateChange: (newState: Partial<TemplatesSearchState>) => void;
  onTemplateSelect?: (templateId: string) => void;
}

export function SloTemplatesTable({ state, onStateChange, onTemplateSelect }: Props) {
  const {
    services: {
      http,
      application: { navigateToUrl },
    },
  } = useKibana();
  const { data: permissions } = usePermissions();
  const { search, tags, page, perPage } = state;

  const { isLoading, isError, data } = useFetchSloTemplates({
    search,
    tags,
    page: page + 1,
    perPage,
  });

  const handleCreateFromTemplate = (templateId: string) => {
    if (onTemplateSelect) {
      onTemplateSelect(templateId);
    } else {
      navigateToUrl(http.basePath.prepend(paths.sloCreateFromTemplate(templateId)));
    }
  };

  const actions: Array<DefaultItemAction<SLOTemplateResponse>> = [
    {
      name: i18n.translate('xpack.slo.sloTemplatesTable.actions.createSlo', {
        defaultMessage: 'Create from template',
      }),
      description: i18n.translate('xpack.slo.sloTemplatesTable.actions.createSloDescription', {
        defaultMessage: 'Create SLO from this template',
      }),
      'data-test-subj': 'sloTemplateActionCreate',
      enabled: () => !!permissions?.hasAllWriteRequested,
      onClick: (template: SLOTemplateResponse) => {
        handleCreateFromTemplate(template.templateId);
      },
    },
  ];

  const columns: Array<EuiBasicTableColumn<SLOTemplateResponse>> = [
    {
      field: 'name',
      name: i18n.translate('xpack.slo.sloTemplatesTable.columns.nameLabel', {
        defaultMessage: 'Name',
      }),
      truncateText: true,
    },
    {
      field: 'description',
      name: i18n.translate('xpack.slo.sloTemplatesTable.columns.descriptionLabel', {
        defaultMessage: 'Description',
      }),
      truncateText: true,
    },
    {
      field: 'tags',
      name: i18n.translate('xpack.slo.sloTemplatesTable.columns.tagsLabel', {
        defaultMessage: 'Tags',
      }),
      render: (value: SLOTemplateResponse['tags']) => {
        if (!value?.length) return null;
        return (
          <EuiFlexGroup gutterSize="xs" wrap responsive>
            {value.map((tag) => (
              <EuiFlexItem key={tag} grow={false}>
                <EuiBadge color="hollow">{tag}</EuiBadge>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        );
      },
    },
    {
      name: i18n.translate('xpack.slo.sloTemplatesTable.columns.actionsLabel', {
        defaultMessage: 'Actions',
      }),
      width: '10%',
      actions,
    },
  ];

  const onTableChange = ({ page: newPage }: Criteria<SLOTemplateResponse>) => {
    if (newPage) {
      onStateChange({ page: newPage.index, perPage: newPage.size });
    }
  };

  const pagination = {
    pageIndex: page,
    pageSize: perPage,
    totalItemCount: data?.total ?? 0,
    pageSizeOptions: [10, 25, 50, 100],
    showPerPageOptions: true,
  };

  if (!isLoading && !isError && data?.total === 0 && !search && !tags.length) {
    return (
      <EuiPanel hasBorder>
        <EuiEmptyPrompt
          data-test-subj="sloTemplatesEmptyPrompt"
          iconType="document"
          title={
            <h2>
              {i18n.translate('xpack.slo.sloTemplatesTable.emptyTitle', {
                defaultMessage: 'No SLO templates found',
              })}
            </h2>
          }
          body={
            <p>
              {i18n.translate('xpack.slo.sloTemplatesTable.emptyBody', {
                defaultMessage:
                  'SLO templates are installed via Fleet integration packages. Visit the Integrations page to install packages that include SLO templates.',
              })}
            </p>
          }
        />
      </EuiPanel>
    );
  }

  return (
    <EuiPanel hasBorder>
      <SloTemplatesSearchBar state={state} onStateChange={onStateChange} />
      <EuiSpacer size="m" />
      <EuiText size="xs">
        {i18n.translate('xpack.slo.sloTemplatesTable.itemCount', {
          defaultMessage: 'Showing {count} of {total} SLO templates',
          values: {
            count: data?.results.length ?? 0,
            total: data?.total ?? 0,
          },
        })}
      </EuiText>
      <EuiSpacer size="s" />
      <EuiBasicTable<SLOTemplateResponse>
        tableCaption={TABLE_CAPTION}
        error={
          isError
            ? i18n.translate('xpack.slo.sloTemplatesTable.error', {
                defaultMessage: 'An error occurred while retrieving SLO templates',
              })
            : undefined
        }
        items={data?.results ?? []}
        rowHeader="name"
        columns={columns}
        itemId="templateId"
        pagination={pagination}
        onChange={onTableChange}
        loading={isLoading}
      />
    </EuiPanel>
  );
}

const TABLE_CAPTION = i18n.translate('xpack.slo.sloTemplatesTable.caption', {
  defaultMessage: 'SLO Templates',
});
