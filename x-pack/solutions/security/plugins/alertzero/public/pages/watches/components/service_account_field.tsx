/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiFilterButton, EuiFilterGroup, EuiPopover } from '@elastic/eui';
import { css } from '@emotion/react';
import type { CoreStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { ServiceAccountPickerProps } from '@kbn/security-plugin/public';
import { useServiceAccountName } from '../../../hooks/use_service_account_name';
import type { AlertZeroStartDependencies } from '../../../types';
import * as settingsI18n from '../settings_translations';

interface ServiceAccountFieldProps {
  workerId: string;
  workerName: string;
  current?: string;
  isDisabled?: boolean;
  fullWidth?: boolean;
  /** Overrides the per-worker aria label when one control covers several workers. */
  ariaLabel?: string;
  onChange: (serviceAccountId: string | null, accountName?: string) => void;
}

/**
 * Closed control around Security's shared service-account list. The list is the menu body;
 * this filter button is the bordered dropdown that opens it.
 */
const ServiceAccountFieldComponent: React.FC<ServiceAccountFieldProps> = ({
  workerId,
  workerName,
  current,
  isDisabled,
  fullWidth = true,
  ariaLabel,
  onChange,
}) => {
  const { services } = useKibana<CoreStart & AlertZeroStartDependencies>();
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedName, setSelectedName] = useState<{ id: string; name: string }>();
  const loadedName = useServiceAccountName(current);
  const getServiceAccountPicker = services.security?.uiApi?.components.getServiceAccountPicker;
  const getCreateServiceAccount = services.security?.uiApi?.components.getCreateServiceAccount;

  const close = () => setIsOpen(false);
  const popoverLabel = ariaLabel ?? settingsI18n.serviceAccountSelectAriaLabel(workerName);
  const pickerProps: ServiceAccountPickerProps = {
    selectedId: current,
    onSelect: (account) => {
      setSelectedName(account ? { id: account.id, name: account.name } : undefined);
      onChange(account ? account.id : null, account?.name);
      close();
    },
    onClose: close,
    onCreate: () => {
      close();
      setIsCreating(true);
    },
  };
  const accountName = current && selectedName?.id === current ? selectedName.name : loadedName;
  const label = current == null ? settingsI18n.SERVICE_ACCOUNT_PLACEHOLDER : accountName ?? current;

  return (
    <>
      <EuiFilterGroup fullWidth={fullWidth} showDividers={false}>
        <EuiPopover
          button={
            <EuiFilterButton
              aria-label={popoverLabel}
              data-test-subj={`alertZeroServiceAccountSelect-${workerId}`}
              iconType="chevronSingleDown"
              isSelected={isOpen}
              isDisabled={isDisabled}
              grow={fullWidth}
              onClick={() => setIsOpen((open) => !open)}
            >
              {label}
            </EuiFilterButton>
          }
          isOpen={isOpen}
          closePopover={close}
          panelPaddingSize="none"
          aria-label={popoverLabel}
          display={fullWidth ? 'block' : 'inline-block'}
          css={
            fullWidth
              ? css`
                  width: 100%;
                `
              : undefined
          }
        >
          {isOpen ? getServiceAccountPicker?.(pickerProps) : null}
        </EuiPopover>
      </EuiFilterGroup>
      {isCreating
        ? getCreateServiceAccount?.({
            onClose: () => setIsCreating(false),
            onCreated: (account) => {
              setIsCreating(false);
              setSelectedName({ id: account.id, name: account.name });
              onChange(account.id, account.name);
            },
          })
        : null}
    </>
  );
};

export const ServiceAccountField = React.memo(ServiceAccountFieldComponent);
