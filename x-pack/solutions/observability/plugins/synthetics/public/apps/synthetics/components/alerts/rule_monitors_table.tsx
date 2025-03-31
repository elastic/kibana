/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Criteria, EuiLink, EuiInMemoryTable, EuiSearchBarProps } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useSelector } from 'react-redux';
import { uniqBy } from 'lodash';
import { selectInspectStatusRule } from '../../state/alert_rules/selectors';
import { ClientPluginsStart } from '../../../../plugin';

export const RuleMonitorsTable = () => {
  const {
    services: { http },
  } = useKibana<ClientPluginsStart>();
  const { data } = useSelector(selectInspectStatusRule);

  const [pageIndex, setPageIndex] = React.useState(0);
  const [pageSize, setPageSize] = React.useState(10);

  const onTableChange = ({ page }: Criteria<any>) => {
    if (page) {
      setPageIndex(page.index);
      setPageSize(page.size);
    }
  };

  const columns = [
    {
      field: 'name',
      name: i18n.translate('xpack.synthetics.ruleDetails.monitorsTable.nameColumn', {
        defaultMessage: 'Name',
      }),
      render: (name: string, monitor: { id: string }) => (
        <EuiLink
          data-test-subj="ColumnsLink"
          href={http.basePath.prepend(`/app/synthetics/monitor/${monitor.id}`)}
        >
          {name}
        </EuiLink>
      ),
    },
    {
      field: 'id',
      name: i18n.translate('xpack.synthetics.ruleDetails.monitorsTable.idColumn', {
        defaultMessage: 'ID',
      }),
    },
    {
      field: 'type',
      name: i18n.translate('xpack.synthetics.ruleDetails.monitorsTable.type', {
        defaultMessage: 'Type',
      }),
    },
  ];

  const search: EuiSearchBarProps = {
    box: {
      incremental: true,
      schema: true,
    },
    filters: [
      {
        type: 'field_value_selection',
        field: 'type',
        name: i18n.translate('xpack.synthetics.ruleDetails.monitorsTable.typeFilter', {
          defaultMessage: 'Type',
        }),
        multiSelect: false,
        options:
          uniqBy(
            data?.monitors.map((monitor) => ({
              value: monitor.type,
              name: monitor.type,
            })),
            'value'
          ) ?? [],
      },
    ],
  };

  return (
    <EuiInMemoryTable
      tableLayout="auto"
      css={{ width: 600 }}
      items={data?.monitors ?? []}
      columns={columns}
      onChange={onTableChange}
      search={search}
      pagination={{
        pageIndex,
        pageSize,
        showPerPageOptions: true,
      }}
    />
  );
};
