/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Route, Routes } from '@kbn/shared-ux-router';
import { TrackApplicationView } from '@kbn/usage-collection-plugin/public';
import { i18n } from '@kbn/i18n';
import { AttacksPage } from './attacks';
import { ATTACKS_PATH, SecurityPageName } from '../../../../common/constants';
import { NotFoundPage } from '../../../app/404';
import { SpyRoute } from '../../../common/utils/route/spy_routes';
import { useReadonlyHeader } from '../../../use_readonly_header';

const READ_ONLY_BADGE_TOOLTIP = i18n.translate(
  'xpack.securitySolution.attacksPage.badge.readOnly.tooltip',
  {
    defaultMessage: 'Unable to update attacks',
  }
);

const AttacksRoute = () => (
  <TrackApplicationView viewId={SecurityPageName.attacks}>
    <AttacksPage />
    <SpyRoute pageName={SecurityPageName.attacks} />
  </TrackApplicationView>
);

export const AttacksContainerComponent: React.FC = () => {
  useReadonlyHeader(READ_ONLY_BADGE_TOOLTIP);
  return (
    <Routes>
      <Route path={ATTACKS_PATH} exact component={AttacksRoute} />
      <Route component={NotFoundPage} />
    </Routes>
  );
};

export const Attacks = React.memo(AttacksContainerComponent);
