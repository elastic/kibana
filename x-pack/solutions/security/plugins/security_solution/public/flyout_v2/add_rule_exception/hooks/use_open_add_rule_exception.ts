/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import { useStore } from 'react-redux';
import type { OverlayRef } from '@kbn/core-mount-utils-browser';
import type { DataTableRecord } from '@kbn/discover-utils';
import type { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import { DOC_VIEWER_FLYOUT_HISTORY_KEY } from '@kbn/unified-doc-viewer';
import { useKibana } from '../../../common/lib/kibana';
import { useIsInSecurityApp } from '../../../common/hooks/is_in_security_app';
import { flyoutProviders } from '../../shared/components/flyout_provider';
import { defaultToolsFlyoutProperties } from '../../shared/hooks/use_default_flyout_properties';
import { documentFlyoutHistoryKey } from '../../shared/constants/flyout_history';
import { AddRuleException } from '..';

export interface UseOpenAddRuleExceptionArgs {
  /**
   * Alert document the exception will be created from.
   */
  hit: DataTableRecord;
  /**
   * Callback invoked when the exception form closes any alerts as part of submission.
   */
  onAlertUpdated?: () => void;
}

/**
 * Returns a callback that opens the Add Rule / Endpoint exception form in a system flyout.
 * The selected `ExceptionListTypeEnum` (or `null` for the default rule exception) is passed in
 * from the take-action menu.
 */
export const useOpenAddRuleException = ({
  hit,
  onAlertUpdated,
}: UseOpenAddRuleExceptionArgs) => {
  const { services } = useKibana();
  const { overlays } = services;
  const store = useStore();
  const history = useHistory();
  const isInSecurityApp = useIsInSecurityApp();
  const historyKey = isInSecurityApp ? documentFlyoutHistoryKey : DOC_VIEWER_FLYOUT_HISTORY_KEY;

  return useCallback(
    (type: ExceptionListTypeEnum | null) => {
      let ref: OverlayRef | null = null;

      const close = () => ref?.close();

      const handleCancel = () => {
        close();
      };

      const handleConfirm = (
        _didRuleChange: boolean,
        didCloseAlert: boolean,
        didBulkCloseAlert: boolean
      ) => {
        if ((didCloseAlert || didBulkCloseAlert) && onAlertUpdated) {
          onAlertUpdated();
        }
        close();
      };

      ref = overlays.openSystemFlyout(
        flyoutProviders({
          services,
          store,
          history,
          children: React.createElement(AddRuleException, {
            hit,
            exceptionListType: type,
            onCancel: handleCancel,
            onConfirm: handleConfirm,
          }),
        }),
        {
          ...defaultToolsFlyoutProperties,
          historyKey,
          session: 'start',
        }
      );
    },
    [overlays, services, store, history, historyKey, hit, onAlertUpdated]
  );
};
