/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useContext, useMemo } from 'react';
import type { EuiButtonEmpty, EuiButtonIcon } from '@elastic/eui';
import { isString } from 'lodash/fp';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { EntityType } from '../../../../../../common/search_strategy';
import { EntityDetailsLink } from '../../../../../common/components/links';
import { ServicePanelKey } from '../../../../../flyout/entity_details/shared/constants';
import { StatefulEventContext } from '../../../../../common/components/events_viewer/stateful_event_context';
import { getEmptyTagValue } from '../../../../../common/components/empty_value';
import { TruncatableText } from '../../../../../common/components/truncatable_text';
import { useIsInSecurityApp } from '../../../../../common/hooks/is_in_security_app';

interface Props {
  contextId: string;
  Component?: typeof EuiButtonEmpty | typeof EuiButtonIcon;
  isButton?: boolean;
  onClick?: () => void;
  value: string | number | undefined | null;
  title?: string;
}

const ServiceNameComponent: React.FC<Props> = ({
  Component,
  contextId,
  isButton,
  onClick,
  title,
  value,
}) => {
  const eventContext = useContext(StatefulEventContext);
  const serviceName = `${value}`;
  const isInTimelineContext = serviceName && eventContext?.timelineID;
  const { openFlyout } = useExpandableFlyoutApi();

  const isInSecurityApp = useIsInSecurityApp();

  const openServiceDetailsSidePanel = useCallback(
    (e: React.SyntheticEvent) => {
      e.preventDefault();

      if (onClick) {
        onClick();
      }

      if (!eventContext || !isInTimelineContext) {
        return;
      }

      const { timelineID } = eventContext;

      openFlyout({
        right: {
          id: ServicePanelKey,
          params: {
            serviceName,
            contextID: contextId,
            scopeId: timelineID,
          },
        },
      });
    },
    [contextId, eventContext, isInTimelineContext, onClick, openFlyout, serviceName]
  );

  const content = useMemo(
    () => (
      <EntityDetailsLink
        Component={Component}
        entityName={serviceName}
        isButton={isButton}
        onClick={isInTimelineContext || !isInSecurityApp ? openServiceDetailsSidePanel : undefined}
        title={title}
        entityType={EntityType.service}
      >
        <TruncatableText data-test-subj="draggable-truncatable-content">
          {serviceName}
        </TruncatableText>
      </EntityDetailsLink>
    ),
    [
      serviceName,
      isButton,
      isInTimelineContext,
      openServiceDetailsSidePanel,
      Component,
      title,
      isInSecurityApp,
    ]
  );

  return isString(value) && serviceName.length > 0 ? content : getEmptyTagValue();
};

export const ServiceName = React.memo(ServiceNameComponent);
ServiceName.displayName = 'ServiceName';
