/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiIconTip,
  EuiLink,
  EuiText,
} from '@elastic/eui';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import type { ComponentState, ComponentStatus } from '../../../common/constants';

interface ComponentRowProps {
  component: ComponentStatus;
  onRepair: (id: string) => void;
  repairingId: string | null;
}

export const ComponentRow = ({ component, onRepair, repairingId }: ComponentRowProps) => {
  const isRepairing = repairingId === component.id;
  return (
    <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
      <EuiFlexItem grow={false} style={{ minWidth: 200 }}>
        <EuiHealth color={stateToHealth(component.state)}>
          {component.actionLink ? (
            <EuiLink data-test-subj="errorSentryComponentRowLink" href={component.actionLink}>
              {component.label}
            </EuiLink>
          ) : (
            component.label
          )}
        </EuiHealth>
      </EuiFlexItem>
      <EuiFlexItem>
        {component.detail && (
          <EuiText size="xs" color="subdued">
            {component.detail}
          </EuiText>
        )}
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="s" responsive={false} alignItems="center">
          {component.repairable && (
            <EuiFlexItem grow={false}>
              <EuiButton
                size="s"
                onClick={() => onRepair(component.id)}
                isLoading={isRepairing}
                data-test-subj={`errorSentryRepair-${component.id}`}
              >
                <FormattedMessage id="xpack.errorSentry.overview.repair" defaultMessage="Repair" />
              </EuiButton>
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={false}>
            <EuiIconTip content={stateLabel(component.state)} {...stateIcon(component.state)} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const stateToHealth = (
  state: ComponentState
): 'success' | 'warning' | 'danger' | 'subdued' | 'primary' => {
  switch (state) {
    case 'ok':
      return 'success';
    case 'warning':
      return 'warning';
    case 'missing':
    case 'error':
    case 'drifted':
      return 'danger';
    case 'info':
      return 'primary';
    case 'unavailable':
      return 'subdued';
  }
};

const stateLabel = (state: ComponentState): string => {
  switch (state) {
    case 'ok':
      return i18n.translate('xpack.errorSentry.overview.state.ok', { defaultMessage: 'OK' });
    case 'warning':
      return i18n.translate('xpack.errorSentry.overview.state.warning', {
        defaultMessage: 'Warning',
      });
    case 'missing':
      return i18n.translate('xpack.errorSentry.overview.state.missing', {
        defaultMessage: 'Not installed',
      });
    case 'drifted':
      return i18n.translate('xpack.errorSentry.overview.state.drifted', {
        defaultMessage: 'Drifted',
      });
    case 'error':
      return i18n.translate('xpack.errorSentry.overview.state.error', {
        defaultMessage: 'Error',
      });
    case 'unavailable':
      return i18n.translate('xpack.errorSentry.overview.state.unavailable', {
        defaultMessage: 'Unavailable',
      });
    case 'info':
      return i18n.translate('xpack.errorSentry.overview.state.info', {
        defaultMessage: 'Optional',
      });
  }
};

const stateIcon = (state: ComponentState): { type: string; color: string } => {
  switch (state) {
    case 'ok':
      return { type: 'checkCircleFill', color: 'success' };
    case 'warning':
      return { type: 'warning', color: 'warning' };
    case 'missing':
    case 'error':
      return { type: 'errorFill', color: 'danger' };
    case 'drifted':
      return { type: 'alert', color: 'danger' };
    case 'unavailable':
      return { type: 'minusInCircleFilled', color: 'subdued' };
    case 'info':
      return { type: 'info', color: 'primary' };
  }
};
