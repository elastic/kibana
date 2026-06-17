/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import { EuiButton, EuiCallOut, EuiSpacer } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { Status } from '../../../../../../../common/types/api';

import { KibanaLogic } from '../../../../../shared/kibana';
import { LicensingLogic } from '../../../../../shared/licensing';
import {
  LicensingCallout,
  LICENSING_FEATURE,
} from '../../../../../shared/licensing_callout/licensing_callout';
import { CreateCustomPipelineApiLogic } from '../../../../api/index/create_custom_pipeline_api_logic';

import { IndexViewLogic } from '../../index_view_logic';

import { PipelinesLogic } from '../pipelines_logic';

export const CopyAndCustomizePipelinePanel: React.FC = () => {
  const { indexName, ingestionMethod } = useValues(IndexViewLogic);
  const { isCloud } = useValues(KibanaLogic);
  const { hasPlatinumLicense } = useValues(LicensingLogic);
  const { status: createStatus } = useValues(CreateCustomPipelineApiLogic);
  const { hasIndexIngestionPipeline, pipelineName } = useValues(PipelinesLogic);
  const { makeRequest: createCustomPipeline } = useActions(CreateCustomPipelineApiLogic);

  const isGated = !isCloud && !hasPlatinumLicense;

  if (hasIndexIngestionPipeline) return null;
  if (isGated) {
    return (
      <>
        <LicensingCallout feature={LICENSING_FEATURE.PIPELINES} />
        <EuiSpacer />
      </>
    );
  }
  return (
    <>
      <EuiCallOut
        title={i18n.translate(
          'xpack.enterpriseSearch.content.index.pipelines.copyCustomizeCallout.title',
          { defaultMessage: 'Unlock your custom pipelines' }
        )}
        iconType="lock"
      >
        <p>
          <FormattedMessage
            id="xpack.enterpriseSearch.content.index.pipelines.copyCustomizeCallout.description"
            defaultMessage="Your index is using our default ingestion pipeline, {defaultPipeline}. Copy that pipeline into an index-specific configuration to unlock the ability to create custom ingestion and inference pipelines."
            values={{
              defaultPipeline: <strong>{pipelineName}</strong>,
            }}
          />
        </p>
        <EuiButton
          data-telemetry-id={`entSearchContent-${ingestionMethod}-pipelines-ingestPipelines-copyAndCustomize`}
          isLoading={createStatus === Status.LOADING}
          iconType="lockOpen"
          onClick={() => createCustomPipeline({ indexName })}
        >
          {i18n.translate(
            'xpack.enterpriseSearch.content.index.pipelines.ingestFlyout.copyButtonLabel',
            { defaultMessage: 'Copy and customize' }
          )}
        </EuiButton>
      </EuiCallOut>
      <EuiSpacer />
    </>
  );
};
