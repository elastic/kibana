/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useReducer } from 'react';
import {
  EuiSuperDatePicker,
  EuiButton,
  EuiText,
  EuiFlexGroup,
  EuiSwitch,
  EuiFlexItem,
  EuiBottomBar,
  EuiButtonEmpty,
  EuiSpacer,
  useEuiTheme,
} from '@elastic/eui';
import { useAppToasts } from '../../common/hooks/use_app_toasts';
import * as i18n from '../translations';
import { useConfigureSORiskEngineMutation } from '../api/hooks/use_configure_risk_engine_saved_object';
import { getEntityAnalyticsRiskScorePageStyles } from './risk_score_page_styles';

interface RiskScoreConfigurationState {
  saved: {
    includeClosedAlerts: boolean;
    start: string;
    end: string;
  };
  draft: {
    includeClosedAlerts: boolean;
    start: string;
    end: string;
  };
  showBar: boolean;
}

type RiskScoreConfigurationAction =
  | { type: 'updateField'; field: 'includeClosedAlerts' | 'start' | 'end'; value: boolean | string }
  | { type: 'saveChanges' }
  | { type: 'discardChanges' };

function riskScoreConfigurationReducer(
  state: RiskScoreConfigurationState,
  action: RiskScoreConfigurationAction
): RiskScoreConfigurationState {
  switch (action.type) {
    case 'updateField': {
      const draft = { ...state.draft, [action.field]: action.value };
      const showBar =
        draft.includeClosedAlerts !== state.saved.includeClosedAlerts ||
        draft.start !== state.saved.start ||
        draft.end !== state.saved.end;

      return { ...state, draft, showBar };
    }
    case 'saveChanges': {
      return {
        saved: { ...state.draft },
        draft: { ...state.draft },
        showBar: false,
      };
    }
    case 'discardChanges': {
      return {
        saved: { ...state.saved },
        draft: { ...state.saved },
        showBar: false,
      };
    }
    default:
      return state;
  }
}

export const RiskScoreConfigurationSection = ({
  includeClosedAlerts,
  from,
  to,
}: {
  includeClosedAlerts: boolean;
  from: string;
  to: string;
}) => {
  const { euiTheme } = useEuiTheme();
  const styles = getEntityAnalyticsRiskScorePageStyles(euiTheme);
  const { addSuccess } = useAppToasts();
  const { mutate } = useConfigureSORiskEngineMutation();

  const [isLoading, setIsLoading] = React.useState(false);

  const [state, dispatch] = useReducer(riskScoreConfigurationReducer, {
    saved: {
      includeClosedAlerts,
      start: from,
      end: to,
    },
    draft: {
      includeClosedAlerts,
      start: from,
      end: to,
    },
    showBar: false,
  });

  const handleDateChange = ({ start, end }: { start: string; end: string }) => {
    dispatch({ type: 'updateField', field: 'start', value: start });
    dispatch({ type: 'updateField', field: 'end', value: end });
  };

  const handleToggle = () => {
    dispatch({
      type: 'updateField',
      field: 'includeClosedAlerts',
      value: !state.draft.includeClosedAlerts,
    });
  };

  const handleSave = () => {
    setIsLoading(true);
    mutate(
      {
        includeClosedAlerts: state.draft.includeClosedAlerts,
        range: { start: state.draft.start, end: state.draft.end },
      },
      {
        onSuccess: () => {
          setIsLoading(false);
          addSuccess(i18n.RISK_ENGINE_SAVED_OBJECT_CONFIGURATION_SUCCESS, {
            toastLifeTimeMs: 5000,
          });
          dispatch({ type: 'saveChanges' });
        },
        onError: () => setIsLoading(false),
      }
    );
  };

  return (
    <>
      <EuiFlexGroup alignItems="center">
        <div>
          <EuiSwitch
            label={i18n.INCLUDE_CLOSED_ALERTS_LABEL}
            checked={state.draft.includeClosedAlerts}
            onChange={handleToggle}
            data-test-subj="includeClosedAlertsSwitch"
          />
        </div>
        <styles.VerticalSeparator />
        <div>
          <EuiSuperDatePicker
            start={state.draft.start}
            end={state.draft.end}
            onTimeChange={handleDateChange}
            width="auto"
            compressed={false}
            showUpdateButton={false}
          />
        </div>
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      <EuiText size="s">
        <p>{i18n.RISK_ENGINE_INCLUDE_CLOSED_ALERTS_DESCRIPTION}</p>
      </EuiText>

      {state.showBar && (
        <EuiBottomBar paddingSize="s" position="fixed">
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexGroup gutterSize="s" justifyContent="flexEnd">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  color="text"
                  size="s"
                  iconType="cross"
                  onClick={() => dispatch({ type: 'discardChanges' })}
                >
                  {i18n.DISCARD_CHANGES}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  color="primary"
                  fill
                  size="s"
                  iconType="check"
                  onClick={handleSave}
                  isLoading={isLoading}
                  data-test-subj="riskScoreSaveButton"
                >
                  {i18n.SAVE_CHANGES}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexGroup>
        </EuiBottomBar>
      )}
    </>
  );
};
