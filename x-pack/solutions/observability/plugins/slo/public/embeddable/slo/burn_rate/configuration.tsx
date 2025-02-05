/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFormRow,
  EuiIcon,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useState } from 'react';
import { SloSelector } from '../alerts/slo_selector';
import type { EmbeddableProps } from './types';

interface Props {
  onCreate: (props: EmbeddableProps) => void;
  onCancel: () => void;
}

interface SloConfig {
  sloId: string;
  sloInstanceId: string;
}

export function Configuration({ onCreate, onCancel }: Props) {
  const [selectedSlo, setSelectedSlo] = useState<SloConfig>();
  const [duration, setDuration] = useState<string>('1h');
  const [hasError, setHasError] = useState(false);

  const isDurationValid = duration.match(/^\d+[mhd]$/); // matches 1m, 78m, 1h, 6h, 1d, 24d

  const isValid = !!selectedSlo && isDurationValid;

  const onConfirmClick = () => {
    if (isValid) {
      onCreate({
        sloId: selectedSlo.sloId,
        sloInstanceId: selectedSlo.sloInstanceId,
        duration,
      });
    }
  };

  return (
    <EuiFlyout onClose={onCancel} style={{ minWidth: 550 }}>
      <EuiFlyoutHeader>
        <EuiTitle>
          <h2>
            {i18n.translate('xpack.slo.burnRateEmbeddable.configuration.headerTitle', {
              defaultMessage: 'Burn rate configuration',
            })}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiFlexGroup direction="column" gutterSize="l">
          <EuiFlexItem grow>
            <SloSelector
              singleSelection={true}
              hasError={hasError}
              onSelected={(slo) => {
                setHasError(slo === undefined);
                if (slo && 'id' in slo) {
                  setSelectedSlo({ sloId: slo.id, sloInstanceId: slo.instanceId });
                }
              }}
            />
          </EuiFlexItem>
          <EuiFlexItem grow>
            <EuiFormRow
              fullWidth
              isInvalid={!isDurationValid}
              label={i18n.translate('xpack.slo.burnRateEmbeddable.configuration.durationLabel', {
                defaultMessage: 'Duration',
              })}
            >
              <EuiFieldText
                data-test-subj="sloConfigurationDuration"
                placeholder="1h"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                isInvalid={!isDurationValid}
                append={
                  <EuiToolTip
                    content={i18n.translate(
                      'xpack.slo.burnRateEmbeddable.configuration.durationTooltip',
                      {
                        defaultMessage:
                          'Duration must be in the format of [value][unit], for example 5m, 3h, or 6d',
                      }
                    )}
                  >
                    <EuiIcon type="questionInCircle" />
                  </EuiToolTip>
                }
              />
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiButtonEmpty data-test-subj="sloConfigurationCancelButton" onClick={onCancel}>
            <FormattedMessage
              id="xpack.slo.burnRateEmbeddable.configuration.cancelButtonLabel"
              defaultMessage="Cancel"
            />
          </EuiButtonEmpty>

          <EuiButton
            data-test-subj="sloConfigurationConfirmButton"
            isDisabled={!isValid || hasError}
            onClick={onConfirmClick}
            fill
          >
            <FormattedMessage
              id="xpack.slo.burnRateEmbeddable.configuration.cancelButtonLabel"
              defaultMessage="Confirm"
            />
          </EuiButton>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
}
