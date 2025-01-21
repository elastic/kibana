/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { PopoverAnchorPosition } from '@elastic/eui';
import { EuiButtonEmpty, EuiTourStep } from '@elastic/eui';
import { noop } from 'lodash';
import { FormattedMessage } from '@kbn/i18n-react';
import { DocLink } from '../../../../../common/components/links_to_docs/doc_link';
import { useIsElementMounted } from '../../../../../detection_engine/rule_management_ui/components/rules_table/rules_table/guided_onboarding/use_is_element_mounted';
import {
  NEW_FEATURES_TOUR_STORAGE_KEYS,
  SecurityPageName,
} from '../../../../../../common/constants';
import { useKibana } from '../../../../../common/lib/kibana';
import { SIEM_MIGRATIONS_STATUS_HEADER_ID } from '../../rules_table_columns';
import { SIEM_MIGRATIONS_SELECT_MIGRATION_BUTTON_ID } from '../../header_buttons';
import * as i18n from './translations';

export const SECURITY_GET_STARTED_BUTTON_ANCHOR = `solutionSideNavCustomIconItem-${SecurityPageName.landing}`;

const tourConfig = {
  currentTourStep: 1,
  isTourActive: true,
  tourPopoverWidth: 360,
};

const tourSteps: Array<{
  step: number;
  title: string;
  content: React.ReactNode;
  anchorPosition: PopoverAnchorPosition;
}> = [
  {
    step: 1,
    title: i18n.MIGRATION_RULES_SELECTOR_TOUR_STEP_TITLE,
    content: i18n.MIGRATION_RULES_SELECTOR_TOUR_STEP_CONTENT,
    anchorPosition: 'downCenter',
  },
  {
    step: 2,
    title: i18n.TRANSLATION_STATUS_TOUR_STEP_TITLE,
    content: (
      <FormattedMessage
        id="xpack.securitySolution.siemMigrations.rules.tour.statusStepContent"
        defaultMessage="{installed} rules have a check mark. Click {view} to access rule details. {translated} rules are ready to {install}, or for your to {edit}. Rules with errors can be {reprocessed}. Learn more about our AI Translations here.
        {lineBreak}{lineBreak}
        Learn more about our {link}"
        values={{
          lineBreak: <br />,
          install: <b>{i18n.INSTALL_LABEL}</b>,
          installed: <b>{i18n.INSTALLED_LABEL}</b>,
          view: <b>{i18n.VIEW_LABEL}</b>,
          edit: <b>{i18n.EDIT_LABEL}</b>,
          translated: <b>{i18n.TRANSLATED_LABEL}</b>,
          reprocessed: <b>{i18n.REPROCESSED_LABEL}</b>,
          // TODO: Update doc path once available
          link: <DocLink docPath="index.html" linkText={i18n.SIEM_MIGRATIONS_LINK_LABEL} />,
        }}
      />
    ),
    anchorPosition: 'rightCenter',
  },
  {
    step: 3,
    title: i18n.MIGRATION_GUIDE_TOUR_STEP_TITLE,
    content: i18n.MIGRATION_GUIDE_TOUR_STEP_CONTENT,
    anchorPosition: 'rightCenter',
  },
];

export const SiemTranslatedRulesTour: React.FC = React.memo(() => {
  const { siemMigrations, storage } = useKibana().services;

  const isSelectMigrationAnchorMounted = useIsElementMounted(
    SIEM_MIGRATIONS_SELECT_MIGRATION_BUTTON_ID
  );
  const isStatusHeaderAnchorMounted = useIsElementMounted(SIEM_MIGRATIONS_STATUS_HEADER_ID);
  const isGetStartedNavigationAnchorMounted = useIsElementMounted(
    SECURITY_GET_STARTED_BUTTON_ANCHOR
  );

  const [tourState, setTourState] = useState(() => {
    const restoredTourState = storage.get(
      NEW_FEATURES_TOUR_STORAGE_KEYS.SIEM_RULE_TRANSLATION_PAGE
    );
    if (restoredTourState != null) {
      return restoredTourState;
    }
    return tourConfig;
  });

  const onTourFinished = useCallback(() => {
    setTourState({
      ...tourState,
      isTourActive: false,
    });
  }, [tourState]);

  const onTourNext = useCallback(() => {
    setTourState({
      ...tourState,
      currentTourStep: tourState.currentTourStep + 1,
    });
  }, [tourState]);

  useEffect(() => {
    storage.set(NEW_FEATURES_TOUR_STORAGE_KEYS.SIEM_RULE_TRANSLATION_PAGE, tourState);
  }, [tourState, storage]);

  const isTourActive = useMemo(() => {
    return siemMigrations.rules.isAvailable() && tourState.isTourActive;
  }, [siemMigrations.rules, tourState]);

  const selectMigrationStepData = tourSteps[0];
  const statusHeaderStepData = tourSteps[1];
  const getStartedStepData = tourSteps[2];

  return (
    <>
      {isSelectMigrationAnchorMounted && (
        <EuiTourStep
          title={selectMigrationStepData.title}
          content={selectMigrationStepData.content}
          onFinish={noop}
          step={1}
          stepsTotal={tourSteps.length}
          isStepOpen={isTourActive && tourState.currentTourStep === 1}
          anchor={`#${SIEM_MIGRATIONS_SELECT_MIGRATION_BUTTON_ID}`}
          anchorPosition={selectMigrationStepData.anchorPosition}
          maxWidth={tourState.tourPopoverWidth}
          footerAction={
            <EuiButtonEmpty size="xs" color="text" flush="right" onClick={onTourNext}>
              {i18n.NEXT_TOUR_STEP_BUTTON}
            </EuiButtonEmpty>
          }
        />
      )}
      {isStatusHeaderAnchorMounted && (
        <EuiTourStep
          title={statusHeaderStepData.title}
          content={statusHeaderStepData.content}
          onFinish={noop}
          step={2}
          stepsTotal={tourSteps.length}
          isStepOpen={isTourActive && tourState.currentTourStep === 2}
          anchor={`#${SIEM_MIGRATIONS_STATUS_HEADER_ID}`}
          anchorPosition={statusHeaderStepData.anchorPosition}
          maxWidth={tourState.tourPopoverWidth}
          footerAction={
            <EuiButtonEmpty size="xs" color="text" flush="right" onClick={onTourNext}>
              {i18n.NEXT_TOUR_STEP_BUTTON}
            </EuiButtonEmpty>
          }
        />
      )}
      {isGetStartedNavigationAnchorMounted && (
        <EuiTourStep
          title={getStartedStepData.title}
          content={getStartedStepData.content}
          onFinish={noop}
          step={3}
          stepsTotal={tourSteps.length}
          isStepOpen={isTourActive && tourState.currentTourStep === 3}
          anchor={`#${SECURITY_GET_STARTED_BUTTON_ANCHOR}`}
          anchorPosition={getStartedStepData.anchorPosition}
          maxWidth={tourState.tourPopoverWidth}
          footerAction={
            <EuiButtonEmpty size="xs" color="text" flush="right" onClick={onTourFinished}>
              {i18n.FINISH_TOUR_BUTTON}
            </EuiButtonEmpty>
          }
        />
      )}
    </>
  );
});
SiemTranslatedRulesTour.displayName = 'SiemTranslatedRulesTour';
