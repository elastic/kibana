/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiCallOut, EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useMetadataStateContext } from '../hooks/use_metadata_state';

export const MetadataErrorCallout = () => {
  const { refresh } = useMetadataStateContext();
  return (
    <EuiCallOut
      title={i18n.translate('xpack.infra.metadataEmbeddable.errorTitle', {
        defaultMessage: 'Sorry, there was an error',
      })}
      color="danger"
      iconType="error"
      data-test-subj="infraAssetDetailsMetadataErrorCallout"
    >
      <FormattedMessage
        id="xpack.infra.metadataEmbeddable.errorMessage"
        defaultMessage="There was an error loading your data. Try to {refetch} and open the host details again."
        values={{
          refetch: (
            <EuiLink data-test-subj="infraMetadataReloadPageLink" onClick={refresh}>
              {i18n.translate('xpack.infra.metadataEmbeddable.errorAction', {
                defaultMessage: 'refetch the metadata',
              })}
            </EuiLink>
          ),
        }}
      />
    </EuiCallOut>
  );
};
