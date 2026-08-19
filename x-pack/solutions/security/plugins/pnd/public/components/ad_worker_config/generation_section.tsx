/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiFieldNumber,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIconTip,
  EuiSelect,
  EuiSuperSelect,
} from '@elastic/eui';
import type { CoreStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { i18n } from '@kbn/i18n';
import type { AttackDiscoveryWorkerConfig } from './types';
import { useAdConnectors } from './use_ad_connectors';

interface Props {
  value: AttackDiscoveryWorkerConfig;
  onChange: (patch: Partial<AttackDiscoveryWorkerConfig>) => void;
}

const DEFAULT_OPTION_VALUE = '';
const ADD_MODEL_OPTION_VALUE = '__add_model__';
// Stack Management → Alerts and Insights → Connectors (where GenAI connectors are created).
const CONNECTORS_MANAGEMENT_PATH = '/insightsAndAlerting/triggersActions/connectors';

const UNIT_OPTIONS = [
  {
    value: 'm',
    text: i18n.translate('xpack.pnd.adWorkerConfig.generation.unitMinutes', {
      defaultMessage: 'minutes',
    }),
  },
  {
    value: 'h',
    text: i18n.translate('xpack.pnd.adWorkerConfig.generation.unitHours', {
      defaultMessage: 'hours',
    }),
  },
  {
    value: 'd',
    text: i18n.translate('xpack.pnd.adWorkerConfig.generation.unitDays', {
      defaultMessage: 'days',
    }),
  },
];

const parseEvery = (every: string): { amount: number; unit: string } => {
  const match = /^(\d+)([mhd])$/.exec(every);
  return match ? { amount: Number(match[1]), unit: match[2] } : { amount: 15, unit: 'm' };
};

export const GenerationSection: React.FC<Props> = ({ value, onChange }) => {
  const { services } = useKibana<CoreStart>();
  const { data: connectors = [], isLoading } = useAdConnectors();
  const { amount, unit } = parseEvery(value.run_every);

  const options = useMemo(
    () => [
      {
        value: DEFAULT_OPTION_VALUE,
        inputDisplay: i18n.translate('xpack.pnd.adWorkerConfig.generation.connectorDefault', {
          defaultMessage: 'Default AI connector (server-resolved)',
        }),
      },
      ...connectors.map((connector) => ({ value: connector.id, inputDisplay: connector.name })),
      {
        value: ADD_MODEL_OPTION_VALUE,
        inputDisplay: i18n.translate('xpack.pnd.adWorkerConfig.generation.addModel', {
          defaultMessage: '+ Add model',
        }),
      },
    ],
    [connectors]
  );

  return (
    <>
      <EuiFormRow
        label={
          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              {i18n.translate('xpack.pnd.adWorkerConfig.generation.connectorLabel', {
                defaultMessage: 'Connector for generating attack discoveries',
              })}
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiIconTip
                type="info"
                position="right"
                content={i18n.translate('xpack.pnd.adWorkerConfig.generation.connectorInfo', {
                  defaultMessage:
                    'The LLM connector used to generate discoveries. Use "+ Add model" to create a new one.',
                })}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        }
        fullWidth
      >
        <EuiSuperSelect
          fullWidth
          data-test-subj="adWorkerConnector"
          isLoading={isLoading}
          options={options}
          valueOfSelected={value.connector_id ?? DEFAULT_OPTION_VALUE}
          onChange={(selected) => {
            if (selected === ADD_MODEL_OPTION_VALUE) {
              services.application.navigateToApp('management', {
                path: CONNECTORS_MANAGEMENT_PATH,
              });
              return;
            }
            onChange({ connector_id: selected === DEFAULT_OPTION_VALUE ? undefined : selected });
          }}
        />
      </EuiFormRow>

      <EuiFormRow
        label={i18n.translate('xpack.pnd.adWorkerConfig.generation.runEveryLabel', {
          defaultMessage: 'Run every',
        })}
        helpText={i18n.translate('xpack.pnd.adWorkerConfig.generation.runEveryHelp', {
          defaultMessage: 'Cadence of the Watch Floor scheduled trigger that drives the worker.',
        })}
        fullWidth
      >
        <EuiFlexGroup gutterSize="s">
          <EuiFlexItem grow={2}>
            <EuiFieldNumber
              data-test-subj="adWorkerRunEveryAmount"
              min={1}
              value={amount}
              onChange={(event) => onChange({ run_every: `${Number(event.target.value)}${unit}` })}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={3}>
            <EuiSelect
              data-test-subj="adWorkerRunEveryUnit"
              options={UNIT_OPTIONS}
              value={unit}
              onChange={(event) => onChange({ run_every: `${amount}${event.target.value}` })}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFormRow>
    </>
  );
};
