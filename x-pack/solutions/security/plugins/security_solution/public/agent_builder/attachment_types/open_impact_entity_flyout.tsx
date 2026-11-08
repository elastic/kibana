/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { CoreStart } from '@kbn/core/public';
import { toMountPoint } from '@kbn/react-kibana-mount';
import {
  entityStoreIdType,
  impactEntityFlyoutType,
  type ImpactEntityTarget,
} from '@kbn/agentic-investigations-common';
import type { FlyoutDescriptor } from '../../flyout_v2/shared/url_state/flyout_v2_url_param';
import type { SecurityCanvasEmbeddedBundle } from '../components/security_redux_embedded_provider';
import { GroupedAttachmentFlyoutOpener } from './grouped_attachments/flyout_opener';

const OPENER_CONTAINER_TEST_SUBJ = 'securityImpactEntityFlyoutOpener';

/** The name the flyout queries by: `name`, or the id with any Entity Store `type:` prefix cut. */
const entityName = (entity: ImpactEntityTarget): string =>
  entity.name ?? (entityStoreIdType(entity.id) ? entity.id.replace(/^[^:]+:/, '') : entity.id);

/** The entity's main flyout, by Entity Store id when it has one, otherwise by name. */
const toDescriptor = (entity: ImpactEntityTarget): FlyoutDescriptor | undefined => {
  const flyoutType = impactEntityFlyoutType(entity);
  if (!flyoutType) {
    return undefined;
  }
  const name = entityName(entity);
  const entityId = entityStoreIdType(entity.id) ? entity.id : undefined;
  switch (flyoutType) {
    case 'host':
      return { kind: 'host', hostName: name, entityId };
    case 'user':
      return { kind: 'user', userName: name, entityId };
    case 'service':
      return { kind: 'service', serviceName: name, entityId };
  }
};

let unmountOpener: (() => void) | undefined;

const unmount = (): void => {
  unmountOpener?.();
  unmountOpener = undefined;
};

/**
 * The opener opens the flyout on mount, as the "What's happened" rows do. Those rows own their
 * opener; the impact row lives in another plugin and reaches us through a plain callback, so
 * the opener mounts in a hidden node on the body. It stays mounted: its data-view bootstrap
 * registers the listeners that finish initializing the flyout, and removing them when the
 * flyout opens drops that work. The next open replaces this one.
 */
const mountOpener = (element: React.ReactElement, rendering: CoreStart['rendering']): void => {
  unmount();
  let container = document.querySelector<HTMLElement>(
    `[data-test-subj="${OPENER_CONTAINER_TEST_SUBJ}"]`
  );
  if (!container) {
    container = document.createElement('div');
    container.dataset.testSubj = OPENER_CONTAINER_TEST_SUBJ;
    container.style.display = 'none';
    document.body.appendChild(container);
  }
  unmountOpener = toMountPoint(element, rendering)(container);
};

/** Pushes the entity's flyout onto the investigation flyout, the way the "What's happened" rows do. */
export const openImpactEntityFlyout = ({
  entity,
  rendering,
  resolveSecurityCanvasContext,
}: {
  entity: ImpactEntityTarget;
  rendering: CoreStart['rendering'];
  resolveSecurityCanvasContext: () => Promise<SecurityCanvasEmbeddedBundle>;
}): void => {
  const descriptor = toDescriptor(entity);
  if (!descriptor) {
    return;
  }

  mountOpener(
    <GroupedAttachmentFlyoutOpener
      descriptor={descriptor}
      resolveSecurityCanvasContext={resolveSecurityCanvasContext}
    />,
    rendering
  );
};
