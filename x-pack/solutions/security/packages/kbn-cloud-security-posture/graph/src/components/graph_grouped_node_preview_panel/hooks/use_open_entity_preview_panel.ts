/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import type { EntityDocumentDataModel } from '@kbn/cloud-security-posture-common/types/graph/latest';
import {
  GenericEntityPanelKey,
  GENERIC_ENTITY_PREVIEW_BANNER,
  EntityPanelKeyByType,
} from '../constants';

// TODO: this is a repeated call of graph_visaulization controller. Should be refactored.
// Graph visualization should listen to open preview panel and handle it instead of having this repetitive code.

export const useOpenEntityPreviewPanel = () => {
  const { openPreviewPanel } = useExpandableFlyoutApi();

  return (entityId: string, scopeId: string, entity: EntityDocumentDataModel) => {
    const engineType = entity.engine_type;
    const panelId =
      engineType && engineType in EntityPanelKeyByType
        ? EntityPanelKeyByType[engineType as keyof typeof EntityPanelKeyByType]
        : GenericEntityPanelKey;

    if (!panelId) {
      // toasts.addDanger({
      //   title: i18n.translate(
      //     'xpack.securitySolution.flyout.shared.components.graphVisualization.errorInvalidEntityPanel',
      //     {
      //       defaultMessage: 'Unable to open entity preview',
      //     }
      //   ),
      // });
      return;
    }

    const params =
      engineType === 'host'
        ? { hostName: entity.name }
        : engineType === 'user'
        ? { userName: entity.name }
        : engineType === 'service'
        ? { serviceName: entity.name }
        : {};

    openPreviewPanel({
      id: panelId,
      params: {
        entityId,
        scopeId,
        isPreviewMode: true,
        banner: GENERIC_ENTITY_PREVIEW_BANNER,
        isEngineMetadataExist: !!entity,
        ...params,
      },
    });
  };
};
