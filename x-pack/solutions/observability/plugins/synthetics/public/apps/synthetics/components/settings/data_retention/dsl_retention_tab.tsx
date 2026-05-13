/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiBasicTableColumn } from '@elastic/eui';
import { EuiBasicTable, EuiEmptyPrompt, EuiLink } from '@elastic/eui';
import type { IHttpFetchError, ResponseErrorBody } from '@kbn/core-http-browser';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import type { DataStreamStatus } from '../hooks/use_get_data_stream_statuses';
import { useGetDataStreamStatuses } from '../hooks/use_get_data_stream_statuses';
import { Unprivileged } from './unprivileged';
import { useManagementLocator } from './use_management_locator';

export const DslRetentionTab = () => {
  const { dataStreamStatuses = [], loading, error } = useGetDataStreamStatuses();

  if (error && (error as unknown as IHttpFetchError<ResponseErrorBody>).body?.statusCode === 403)
    return <Unprivileged hideIlmMessage={true} />;

  if (loading === false && dataStreamStatuses.length === 0)
    return <ErrorEmptyPrompt error={error?.message} />;

  return (
    <EuiBasicTable
      rowHeader="name"
      items={dataStreamStatuses}
      loading={loading === true}
      columns={DSL_RETENTION_COLUMNS}
      tableLayout="auto"
      tableCaption={i18n.translate('xpack.synthetics.dslRetention.table.caption', {
        defaultMessage: 'Retention overview',
      })}
    />
  );
};

const DSL_RETENTION_COLUMNS: Array<EuiBasicTableColumn<DataStreamStatus>> = [
  {
    field: 'name',
    name: i18n.translate('xpack.synthetics.dslRetention.columns.name', {
      defaultMessage: 'Dataset',
    }),
    render: (name: string, { dataStreamName }: DataStreamStatus) => {
      if (!dataStreamName) {
        return name;
      }
      return <DataStreamLink dataStream={dataStreamName} name={name} />;
    },
  },
  {
    field: 'storageSize',
    name: i18n.translate('xpack.synthetics.dslRetention.columns.currentSize', {
      defaultMessage: 'Current size',
    }),
  },
  {
    field: 'lifecycle.data_retention',
    name: i18n.translate('xpack.synthetics.dslRetention.columns.retentionPeriod', {
      defaultMessage: 'Retention period',
    }),
  },
  {
    field: 'indexTemplateName',
    name: i18n.translate('xpack.synthetics.dslRetention.columns.indexTemplateName', {
      defaultMessage: 'Index template',
    }),
    render: (indexTemplateName: string) => (
      <IndexTemplateLabel indexTemplateName={indexTemplateName} />
    ),
  },
];

function DataStreamLink({ dataStream, name }: { dataStream: string; name: string }) {
  const templatePath = useManagementLocator(`/data_streams/${dataStream}`);

  if (templatePath === null) return <>{name}</>;
  return (
    <EuiLink
      href={templatePath}
      target="_blank"
      data-test-subj={`xpack.synthetics.dslRetention.indexTemplateLink.${name}`}
    >
      {name}
    </EuiLink>
  );
}

function IndexTemplateLabel({ indexTemplateName }: { indexTemplateName: string }) {
  const templatePath = useManagementLocator(`/templates/${indexTemplateName}`);

  if (templatePath === null) return <>{indexTemplateName}</>;
  return (
    <EuiLink
      href={templatePath}
      target="_blank"
      data-test-subj={`xpack.synthetics.dslRetention.indexTemplateLink.${indexTemplateName}`}
    >
      {indexTemplateName}
    </EuiLink>
  );
}

const ErrorEmptyPrompt = ({ error }: { error?: string }) => (
  <EuiEmptyPrompt
    iconType="error"
    body={
      error ?? (
        <FormattedMessage
          tagName="p"
          id="xpack.synthetics.dslRetention.emptyErrorPrompt"
          defaultMessage="No further error information available"
        />
      )
    }
    color="danger"
    title={
      <FormattedMessage
        tagName="h2"
        id="xpack.synthetics.dslRetention.noData.heading"
        defaultMessage="No data retention information found"
      />
    }
  />
);
