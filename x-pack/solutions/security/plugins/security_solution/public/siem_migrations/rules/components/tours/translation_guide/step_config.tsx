/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import type { PopoverAnchorPosition } from '@elastic/eui';
import { DocLink } from '../../../../../common/components/links_to_docs/doc_link';
import { SecurityPageName } from '../../../../../../common/constants';
import { SIEM_MIGRATIONS_SELECT_MIGRATION_BUTTON_ID } from '../../header_buttons';
import { SIEM_MIGRATIONS_STATUS_HEADER_ID } from '../../rules_table_columns';
import * as i18n from './translations';

export const SECURITY_GET_STARTED_BUTTON_ANCHOR = `solutionSideNavCustomIconItem-${SecurityPageName.landing}`;

export enum TourSteps {
  MIGRATION_SELECTION,
  MIGRATION_RULE_STATUS,
  MIGRATION_ONBOARDING_HUB,
}

export const tourSteps: {
  [key in TourSteps]: {
    step: number;
    title: string;
    content: React.ReactNode;
    anchorId: string;
    anchorPosition: PopoverAnchorPosition;
  };
} = {
  [TourSteps.MIGRATION_SELECTION]: {
    step: 1,
    title: i18n.MIGRATION_RULES_SELECTOR_TOUR_STEP_TITLE,
    content: i18n.MIGRATION_RULES_SELECTOR_TOUR_STEP_CONTENT,
    anchorId: SIEM_MIGRATIONS_SELECT_MIGRATION_BUTTON_ID,
    anchorPosition: 'downCenter',
  },
  [TourSteps.MIGRATION_RULE_STATUS]: {
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
    anchorId: SIEM_MIGRATIONS_STATUS_HEADER_ID,
    anchorPosition: 'rightCenter',
  },
  [TourSteps.MIGRATION_ONBOARDING_HUB]: {
    step: 3,
    title: i18n.MIGRATION_GUIDE_TOUR_STEP_TITLE,
    content: i18n.MIGRATION_GUIDE_TOUR_STEP_CONTENT,
    anchorId: SECURITY_GET_STARTED_BUTTON_ANCHOR,
    anchorPosition: 'rightCenter',
  },
};

export const tourConfig = {
  currentTourStep: tourSteps[TourSteps.MIGRATION_SELECTION].step,
  isTourActive: true,
  tourPopoverWidth: 360,
};
