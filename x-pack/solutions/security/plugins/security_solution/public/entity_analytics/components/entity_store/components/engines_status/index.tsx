/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment } from 'react';
import {
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiButtonEmpty,
  EuiFlexItem,
  EuiFlexGroup,
  EuiCallOut,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { useStoreEntityTypes } from '../../../../hooks/use_enabled_entity_types';
import { useErrorToast } from '../../../../../common/hooks/use_error_toast';
import { downloadBlob } from '../../../../../common/utils/download_blob';
import { EngineComponentsStatusTable } from './components/engine_components_status';
import { useEntityStoreStatus } from '../../hooks/use_entity_store';
import { isEngineLoading } from './helpers';
import { EngineStatusHeader } from './components/engine_status_header';
import { EngineStatusHeaderAction } from './components/engine_status_header_action';

const FILE_NAME = 'engines_status.json';

const errorMessage = i18n.translate(
  'xpack.securitySolution.entityAnalytics.entityStore.enginesStatus.queryError',
  {
    defaultMessage: 'There was an error loading the engine status',
  }
);

export const EngineStatus: React.FC = () => {
  const {
    data,
    isLoading: isStatusAPILoading,
    error,
  } = useEntityStoreStatus({ withComponents: true });
  const enabledEntityTypes = useStoreEntityTypes();

  const downloadJson = () => {
    downloadBlob(new Blob([JSON.stringify(data)]), FILE_NAME);
  };

  useErrorToast(errorMessage, error);

  if (error) {
    return <EuiCallOut title={errorMessage} color="danger" iconType="alert" />;
  }

  if (!data || isStatusAPILoading) return <EuiLoadingSpinner size="xl" />;

  if (data.engines.length === 0) {
    return (
      <FormattedMessage
        id="xpack.securitySolution.entityAnalytics.entityStore.enginesStatus.notFoundMessage"
        defaultMessage="No engines found"
      />
    );
  }

  const enginesStatusData = enabledEntityTypes.map((type) => ({
    type,
    engine: data.engines.find((e) => e.type === type),
  }));

  return (
    <EuiFlexGroup direction="column" gutterSize="none">
      {data?.engines?.length > 0 && (
        <EuiFlexItem grow={false}>
          <EuiFlexGroup justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty size="s" onClick={downloadJson}>
                <FormattedMessage
                  id="xpack.securitySolution.entityAnalytics.entityStore.enginesStatus.downloadButton"
                  defaultMessage="Download status"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      )}
      <EuiFlexItem>
        {enginesStatusData.map(({ engine, type }) => {
          return (
            <Fragment key={type}>
              <EngineStatusHeader
                entityType={type}
                actionButton={<EngineStatusHeaderAction engine={engine} type={type} />}
              />
              <EuiSpacer size="s" />
              <EuiPanel hasShadow={false} hasBorder={false}>
                {engine && !isEngineLoading(engine.status) && engine.components && (
                  <EngineComponentsStatusTable components={engine.components} />
                )}
              </EuiPanel>
              <EuiSpacer size="xl" />
            </Fragment>
          );
        })}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
