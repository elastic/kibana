/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { encode } from '@kbn/rison';
import type { SLODefinitionResponse, SLOWithSummaryResponse } from '@kbn/slo-schema';
import { paths } from '@kbn/slo-shared-plugin/common/locators/paths';
import { useCallback } from 'react';
import { transformSloToCloneState } from '../pages/slo_edit/helpers/transform_slo_to_clone_state';
import { createRemoteSloCloneUrl } from '../utils/slo/remote_slo_urls';
import { useKibana } from './use_kibana';
import { useSpace } from './use_space';

export function useCloneSlo() {
  const {
    http: { basePath },
    application: { navigateToUrl },
  } = useKibana().services;
  const spaceId = useSpace();

  return useCallback(
    (slo: SLOWithSummaryResponse | SLODefinitionResponse) => {
      if ('remote' in slo && slo.remote) {
        window.open(createRemoteSloCloneUrl(slo, spaceId), '_blank');
      } else {
        const clonePath = paths.sloCreateWithEncodedForm(
          encodeURIComponent(encode(transformSloToCloneState(slo)))
        );
        navigateToUrl(basePath.prepend(clonePath));
      }
    },
    [navigateToUrl, basePath, spaceId]
  );
}
