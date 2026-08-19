/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFormRow, EuiSpacer, EuiSuperSelect, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { AttackDiscoveryWorkerConfig } from './types';
import { useAdConnectors } from './use_ad_connectors';

interface Props {
  value: AttackDiscoveryWorkerConfig;
  onChange: (patch: Partial<AttackDiscoveryWorkerConfig>) => void;
}

const DEFAULT_OPTION_VALUE = '';

export const GenerationSection: React.FC<Props> = ({ value, onChange }) => {
  const { data: connectors = [], isLoading } = useAdConnectors();

  const options = useMemo(
    () => [
      {
        value: DEFAULT_OPTION_VALUE,
        inputDisplay: i18n.translate('xpack.pnd.adWorkerConfig.generation.connectorDefault', {
          defaultMessage: 'Default AI connector (server-resolved)',
        }),
      },
      ...connectors.map((connector) => ({
        value: connector.id,
        inputDisplay: connector.name,
      })),
    ],
    [connectors]
  );

  return (
    <>
      <EuiTitle size="xs">
        <h3>
          {i18n.translate('xpack.pnd.adWorkerConfig.generation.title', {
            defaultMessage: 'Generation',
          })}
        </h3>
      </EuiTitle>

      <EuiSpacer size="s" />

      <EuiFormRow
        label={i18n.translate('xpack.pnd.adWorkerConfig.generation.connectorLabel', {
          defaultMessage: 'LLM connector',
        })}
        fullWidth
      >
        <EuiSuperSelect
          fullWidth
          data-test-subj="adWorkerConnector"
          isLoading={isLoading}
          options={options}
          valueOfSelected={value.connector_id ?? DEFAULT_OPTION_VALUE}
          onChange={(connectorId) =>
            onChange({
              connector_id: connectorId === DEFAULT_OPTION_VALUE ? undefined : connectorId,
            })
          }
        />
      </EuiFormRow>
    </>
  );
};
