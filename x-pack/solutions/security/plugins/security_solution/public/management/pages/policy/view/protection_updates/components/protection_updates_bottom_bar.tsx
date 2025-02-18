/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageTemplate,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import type { ApplicationStart } from '@kbn/core-application-browser';
import { useNavigateToAppEventHandler } from '../../../../../../common/hooks/endpoint/use_navigate_to_app_event_handler';
import { APP_UI_ID } from '../../../../../../../common';
import { getPoliciesPath } from '../../../../../common/routing';
import type { PolicyDetailsRouteState } from '../../../../../../../common/endpoint/types';

interface ProtectionUpdatesBottomBarProps {
  saveButtonDisabled: boolean;
  isUpdating: boolean;
  onSave: () => void;
}

export const ProtectionUpdatesBottomBar = React.memo<ProtectionUpdatesBottomBarProps>(
  ({ isUpdating, onSave, saveButtonDisabled }) => {
    const { state: locationRouteState } = useLocation<PolicyDetailsRouteState>();
    const [routeState, setRouteState] = useState<PolicyDetailsRouteState>();
    const routingOnCancelNavigateTo = routeState?.onCancelNavigateTo;

    useEffect(() => {
      if (!routeState && locationRouteState) {
        setRouteState(locationRouteState);
      }
    }, [locationRouteState, routeState]);

    const navigateToAppArguments = useMemo((): Parameters<ApplicationStart['navigateToApp']> => {
      if (routingOnCancelNavigateTo) {
        return routingOnCancelNavigateTo;
      }

      return [
        APP_UI_ID,
        {
          path: getPoliciesPath(),
        },
      ];
    }, [routingOnCancelNavigateTo]);

    const handleCancelOnClick = useNavigateToAppEventHandler(...navigateToAppArguments);

    return (
      <EuiPageTemplate.BottomBar paddingSize="s">
        <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              color="text"
              onClick={handleCancelOnClick}
              data-test-subj="protectionUpdatesCancelButton"
              disabled={isUpdating}
            >
              <FormattedMessage
                id="xpack.securitySolution.endpoint.protectionUpdates.cancel"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill={true}
              disabled={saveButtonDisabled}
              iconType="save"
              data-test-subj="protectionUpdatesSaveButton"
              onClick={onSave}
              isLoading={isUpdating}
            >
              <FormattedMessage
                id="xpack.securitySolution.endpoint.protectionUpdates.save"
                defaultMessage="Save"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPageTemplate.BottomBar>
    );
  }
);

ProtectionUpdatesBottomBar.displayName = 'ProtectionUpdatesBottomBar';
