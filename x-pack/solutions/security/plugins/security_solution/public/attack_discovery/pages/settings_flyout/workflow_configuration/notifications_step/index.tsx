/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { StepAccordion } from '../step_accordion';
import * as i18n from '../translations';

export interface NotificationsStepProps {
  children: React.ReactNode;
  isLast?: boolean;
}

const NotificationsStepComponent: React.FC<NotificationsStepProps> = ({ children, isLast }) => (
  <StepAccordion
    data-test-subj="notificationsStep"
    description={i18n.NOTIFICATIONS_SECTION_DESCRIPTION}
    isLast={isLast}
    stepNumber="4"
    title={i18n.NOTIFICATIONS_SECTION_TITLE}
  >
    {children}
  </StepAccordion>
);

NotificationsStepComponent.displayName = 'NotificationsStep';

export const NotificationsStep = React.memo(NotificationsStepComponent);
