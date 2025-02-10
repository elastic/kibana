/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { toMountPoint } from '@kbn/react-kibana-mount';
import type { LensEmbeddableInput } from '@kbn/lens-plugin/public';
import { unmountComponentAtNode } from 'react-dom';
import { useKibana } from '../../lib/kibana';
import type { LensAttributes } from './types';
import { useRedirectToDashboardFromLens } from './use_redirect_to_dashboard_from_lens';
import { APP_UI_ID, SecurityPageName } from '../../../../common';
import { useGetSecuritySolutionUrl } from '../link_to';

export const useSaveToLibrary = ({
  attributes,
}: {
  attributes: LensAttributes | undefined | null;
}) => {
  const startServices = useKibana().services;
  const canSaveVisualization = !!startServices.application.capabilities.visualize_v2?.save;
  const { SaveModalComponent } = startServices.lens;
  const getSecuritySolutionUrl = useGetSecuritySolutionUrl();
  const { redirectTo, getEditOrCreateDashboardPath } = useRedirectToDashboardFromLens({
    getSecuritySolutionUrl,
  });

  const openSaveVisualizationFlyout = useCallback(() => {
    const targetDomElement = document.createElement('div');
    const mount = toMountPoint(
      <SaveModalComponent
        initialInput={attributes as unknown as LensEmbeddableInput}
        onSave={() => unmountComponentAtNode(targetDomElement)}
        onClose={() => unmountComponentAtNode(targetDomElement)}
        originatingApp={APP_UI_ID}
        getOriginatingPath={(dashboardId) =>
          `${SecurityPageName.dashboards}/${getEditOrCreateDashboardPath(dashboardId)}`
        }
        // Type 'string' is not assignable to type 'RedirectToProps | undefined'.
        // @ts-expect-error
        redirectTo={redirectTo}
      />,
      startServices
    );

    mount(targetDomElement);
  }, [SaveModalComponent, attributes, getEditOrCreateDashboardPath, redirectTo, startServices]);

  const disableVisualizations = useMemo(
    () => !canSaveVisualization || attributes == null,
    [attributes, canSaveVisualization]
  );

  return { openSaveVisualizationFlyout, disableVisualizations };
};
