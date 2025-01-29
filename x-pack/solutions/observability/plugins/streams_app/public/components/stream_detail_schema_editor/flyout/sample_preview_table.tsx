/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { StreamsRepositoryClient } from '@kbn/streams-plugin/public/api';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { EuiCallOut } from '@elastic/eui';
import { NamedFieldDefinitionConfig, WiredStreamGetResponse } from '@kbn/streams-schema';
import { getFormattedError } from '../../../util/errors';
import { useStreamsAppFetch } from '../../../hooks/use_streams_app_fetch';
import { PreviewTable } from '../../preview_table';
import { isFullFieldDefinition } from '../hooks/use_editing_state';
import { LoadingPanel } from '../../loading_panel';

interface SamplePreviewTableProps {
  definition: WiredStreamGetResponse;
  nextFieldDefinition?: Partial<NamedFieldDefinitionConfig>;
  streamsRepositoryClient: StreamsRepositoryClient;
}

export const SamplePreviewTable = (props: SamplePreviewTableProps) => {
  const { nextFieldDefinition, ...rest } = props;
  if (isFullFieldDefinition(nextFieldDefinition)) {
    return <SamplePreviewTableContent nextFieldDefinition={nextFieldDefinition} {...rest} />;
  } else {
    return null;
  }
};

const SAMPLE_DOCUMENTS_TO_SHOW = 20;

const SamplePreviewTableContent = ({
  definition,
  nextFieldDefinition,
  streamsRepositoryClient,
}: SamplePreviewTableProps & { nextFieldDefinition: NamedFieldDefinitionConfig }) => {
  const { value, loading, error } = useStreamsAppFetch(
    ({ signal }) => {
      return streamsRepositoryClient.fetch('POST /api/streams/{id}/schema/fields_simulation', {
        signal,
        params: {
          path: {
            id: definition.stream.name,
          },
          body: {
            field_definitions: [nextFieldDefinition],
          },
        },
      });
    },
    [definition.stream.name, nextFieldDefinition, streamsRepositoryClient],
    {
      disableToastOnError: true,
    }
  );

  const columns = useMemo(() => {
    return [nextFieldDefinition.name];
  }, [nextFieldDefinition.name]);

  if (loading) {
    return <LoadingPanel />;
  }

  if (
    value &&
    (value.status === 'unknown' || value.documentsWithRuntimeFieldsApplied?.length === 0)
  ) {
    return (
      <EuiCallOut>
        {i18n.translate('xpack.streams.samplePreviewTable.unknownStatus', {
          defaultMessage:
            "Couldn't simulate changes due to a lack of indexed documents with this field",
        })}
      </EuiCallOut>
    );
  }

  if ((value && value.status === 'failure') || error) {
    const formattedError = getFormattedError(error);
    return (
      <EuiCallOut
        color="danger"
        title={i18n.translate('xpack.streams.samplePreviewTable.errorTitle', {
          defaultMessage:
            'There was an error simulating these mapping changes with a sample of documents',
        })}
      >
        {value?.simulationError ?? formattedError?.message}
      </EuiCallOut>
    );
  }

  if (value && value.status === 'success' && value.documentsWithRuntimeFieldsApplied) {
    return (
      <div
        css={css`
          height: 500px;
        `}
      >
        <PreviewTable
          documents={value.documentsWithRuntimeFieldsApplied.slice(0, SAMPLE_DOCUMENTS_TO_SHOW)}
          displayColumns={columns}
        />
      </div>
    );
  }

  return null;
};
