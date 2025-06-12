/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useRef } from 'react';
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

  const [checked, setChecked] = useState(includeClosedAlerts);
  const [start, setStart] = useState(from);
  const [end, setEnd] = useState(to);
  const [isLoading, setIsLoading] = useState(false);
  const [showBar, setShowBar] = useState(false);

  // Persist last saved state
  const savedStateRef = useRef({
    includeClosedAlerts,
    start: from,
    end: to,
  });

  useEffect(() => {
    setChecked(includeClosedAlerts);
    setStart(from);
    setEnd(to);
    savedStateRef.current = {
      includeClosedAlerts,
      start: from,
      end: to,
    };
  }, [includeClosedAlerts, from, to]);

  const handleDateChange = ({ start: newStart, end: newEnd }: { start: string; end: string }) => {
    setStart(newStart);
    setEnd(newEnd);
    setShowBar(true);
  };

  const onChange = () => {
    setChecked((prev) => !prev);
    setShowBar(true);
  };

  const handleSave = () => {
    setIsLoading(true);
    mutate(
      {
        includeClosedAlerts: checked,
        range: { start, end },
      },
      {
        onSuccess: () => {
          setShowBar(false);
          addSuccess(i18n.RISK_ENGINE_SAVED_OBJECT_CONFIGURATION_SUCCESS, {
            toastLifeTimeMs: 5000,
          });
          setIsLoading(false);
          savedStateRef.current = {
            includeClosedAlerts: checked,
            start,
            end,
          };
        },
        onError: () => {
          setIsLoading(false);
        },
      }
    );
  };

  const handleDiscard = () => {
    setShowBar(false);
    setChecked(savedStateRef.current.includeClosedAlerts);
    setStart(savedStateRef.current.start);
    setEnd(savedStateRef.current.end);
  };

  return (
    <>
      <EuiFlexGroup alignItems="center">
        <div>
          <EuiSwitch
            label={i18n.INCLUDE_CLOSED_ALERTS_LABEL}
            checked={checked}
            onChange={onChange}
            data-test-subj="includeClosedAlertsSwitch"
          />
        </div>
        <styles.VerticalSeparator />
        <div>
          <EuiSuperDatePicker
            start={start}
            end={end}
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
      {showBar && (
        <EuiBottomBar paddingSize="s" position="fixed">
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexGroup gutterSize="s" justifyContent="flexEnd">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty color="text" size="s" iconType="cross" onClick={handleDiscard}>
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
