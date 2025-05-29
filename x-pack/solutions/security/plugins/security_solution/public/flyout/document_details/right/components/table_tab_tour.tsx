/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import type { EuiTourStepProps } from '@elastic/eui';
import { EuiTourStep, EuiButton, EuiButtonEmpty, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '../../../../common/lib/kibana';
import { FLYOUT_STORAGE_KEYS } from '../../shared/constants/local_storage';
import {
  FLYOUT_TABLE_PIN_ACTION_TEST_ID,
  TABLE_TAB_SETTING_BUTTON_TEST_ID,
  TABLE_TAB_TOUR_TEST_ID,
} from './test_ids';

const TOUR_TITLE = i18n.translate('xpack.securitySolution.flyout.tour.tableTabPinning.title', {
  defaultMessage: 'Customize the Table tab',
});

export const TOUR_STEPS = [
  {
    step: 1,
    title: i18n.translate('xpack.securitySolution.flyout.tour.tableTabPinning.title', {
      defaultMessage: 'Pin fields',
    }),
    content: (
      <EuiText>
        <FormattedMessage
          id="xpack.securitySolution.flyout.tour.tableTabPinning.description"
          defaultMessage="Pin fields that you're interested in or want to save for later."
        />
      </EuiText>
    ),
    anchor: `[data-test-subj=${FLYOUT_TABLE_PIN_ACTION_TEST_ID}]`,
    anchorPosition: 'leftCenter' as EuiTourStepProps['anchorPosition'],
  },
  {
    step: 2,
    title: i18n.translate('xpack.securitySolution.flyout.tour.tableTabSetting.title', {
      defaultMessage: 'Display and hide fields',
    }),
    content: (
      <EuiText>
        <FormattedMessage
          id="xpack.securitySolution.flyout.tour.tableTabSetting.description"
          defaultMessage="Modify the tab's settings to display or hide certain fields. For example, choose to only display highlighted fields."
        />
      </EuiText>
    ),
    anchor: `[data-test-subj=${TABLE_TAB_SETTING_BUTTON_TEST_ID}]`,
    anchorPosition: 'upCenter' as EuiTourStepProps['anchorPosition'],
  },
];

const TOUR_INITIAL_STATE = {
  currentTourStep: 1,
  isTourActive: true,
  tourPopoverWidth: 360,
  tourSubtitle: i18n.translate('xpack.securitySolution.flyout.tour.tableTab.title', {
    defaultMessage: 'Customize the Table tab',
  }),
};

/**
 * A short tour to guide the user through pinning and field settings on the Table tab.
 */
export const TableTabTour = ({
  setIsPopoverOpen,
}: {
  setIsPopoverOpen: (isPopoverOpen: boolean) => void;
}) => {
  const {
    services: { storage },
  } = useKibana();

  const [state, setState] = useState(() => {
    const initialState = storage.get(FLYOUT_STORAGE_KEYS.TABLE_TAB_TOUR);
    return initialState || TOUR_INITIAL_STATE;
  });

  useEffect(() => {
    storage.set(FLYOUT_STORAGE_KEYS.TABLE_TAB_TOUR, state);
  }, [state, storage]);

  const handleClick = useCallback(() => {
    setIsPopoverOpen(true);
    setState({
      ...state,
      currentTourStep: state.currentTourStep + 1,
    });
  }, [state, setIsPopoverOpen, setState]);

  const finishTour = useCallback(() => {
    setState({
      ...state,
      isTourActive: false,
    });
    setIsPopoverOpen(false);
  }, [state, setIsPopoverOpen, setState]);

  if (!state.isTourActive) {
    return null;
  }

  return (
    <>
      {TOUR_STEPS.map((step, index) => {
        return (
          <EuiTourStep
            anchor={step.anchor}
            anchorPosition={step.anchorPosition}
            content={step.content}
            data-test-subj={`${TABLE_TAB_TOUR_TEST_ID}-${index + 1}`}
            isStepOpen={state.isTourActive && state.currentTourStep === index + 1}
            key={index}
            minWidth={state.tourPopoverWidth}
            onFinish={finishTour}
            step={index + 1}
            stepsTotal={TOUR_STEPS.length}
            subtitle={TOUR_TITLE}
            title={step.title}
            footerAction={
              // if it's the last step, we don't want to show the next button
              index === TOUR_STEPS.length - 1 ? (
                <EuiButton color="success" size="s" onClick={finishTour}>
                  {'Finish tour'}
                </EuiButton>
              ) : (
                [
                  <EuiButtonEmpty size="s" color="text" onClick={finishTour}>
                    {'Close tour'}
                  </EuiButtonEmpty>,
                  <EuiButton color="success" size="s" onClick={handleClick}>
                    {'Next'}
                  </EuiButton>,
                ]
              )
            }
          />
        );
      })}
    </>
  );
};
