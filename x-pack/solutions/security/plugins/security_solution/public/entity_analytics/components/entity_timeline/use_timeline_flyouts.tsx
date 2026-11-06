/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, useCallback, useMemo } from 'react';
import { noop } from 'lodash/fp';
import type { HttpStart } from '@kbn/core/public';
import { useKibana } from '../../../common/lib/kibana';
import { useOpenFlyout } from '../../../flyout_v2/shared/hooks/use_open_flyout';
import { useDefaultDocumentFlyoutProperties } from '../../../flyout_v2/shared/hooks/use_default_flyout_properties';
import { cellActionRenderer } from '../../../flyout_v2/shared/components/cell_actions';
import { buildFlyoutNavTitle } from '../../../flyout_v2/shared/utils/build_flyout_nav_title';
import {
  ALERT_TITLE,
  ATTACK_TITLE,
  formatFlyoutTitle,
} from '../../../flyout_v2/shared/constants/flyout_titles';
import { FLYOUT_SESSION_KIND } from '../../../common/lib/telemetry';
import {
  buildPrototypeAlertRecord,
  buildPrototypeAttackRecord,
  buildPrototypeBulkBody,
} from './prototype_flyout_records';
import type { EntityTimelineData, EntityTimelineEvent } from './types';

const DocumentFlyout = lazy(() =>
  import('../../../flyout_v2/document/main').then((m) => ({ default: m.DocumentFlyout }))
);
const AttackFlyout = lazy(() =>
  import('../../../flyout_v2/attack/main').then((m) => ({ default: m.AttackFlyout }))
);

const seeded = new Map<string, Promise<void>>();

/**
 * Design-prototype only: the flyouts re-fetch their document for actions and correlations,
 * so the mock documents are indexed (once per page load) through the Console proxy first.
 */
const ensurePrototypeDocs = (http: HttpStart, data: EntityTimelineData): Promise<void> => {
  const existing = seeded.get(data.entityName);
  if (existing) return existing;
  const request = http
    .post('/api/console/proxy', {
      query: { path: '/_bulk?refresh=wait_for', method: 'POST' },
      headers: { 'Content-Type': 'application/x-ndjson' },
      body: buildPrototypeBulkBody(data),
    })
    .then(noop, noop);
  seeded.set(data.entityName, request);
  return request;
};

export interface TimelineFlyouts {
  openAlert: (event: EntityTimelineEvent) => void;
  openAttack: (attackId: string) => void;
}

/** Opens the real alert and attack flyouts as children (on the left) of the current flyout. */
export const useTimelineFlyouts = (data: EntityTimelineData): TimelineFlyouts => {
  const { http } = useKibana().services;
  const open = useOpenFlyout();
  const documentFlyoutProperties = useDefaultDocumentFlyoutProperties();

  const openAlert = useCallback(
    async (event: EntityTimelineEvent) => {
      await ensurePrototypeDocs(http, data);
      open(
        <DocumentFlyout
          hit={buildPrototypeAlertRecord(event, data)}
          renderCellActions={cellActionRenderer}
          onAlertUpdated={noop}
        />,
        {
          ...documentFlyoutProperties,
          session: FLYOUT_SESSION_KIND.INHERIT,
          title: buildFlyoutNavTitle(formatFlyoutTitle(ALERT_TITLE, event.title)),
        },
        undefined,
        FLYOUT_SESSION_KIND.INHERIT
      );
    },
    [data, documentFlyoutProperties, http, open]
  );

  const openAttack = useCallback(
    async (attackId: string) => {
      const attackEvent = data.events.find(
        (event) => event.kind === 'attack' && event.attackId === attackId
      );
      if (!attackEvent) return;
      await ensurePrototypeDocs(http, data);
      const { hit, attack } = buildPrototypeAttackRecord(attackEvent, data);
      open(
        <AttackFlyout hit={hit} attack={attack} onAttackUpdated={noop} />,
        {
          ...documentFlyoutProperties,
          session: FLYOUT_SESSION_KIND.INHERIT,
          title: buildFlyoutNavTitle(formatFlyoutTitle(ATTACK_TITLE, attackEvent.title)),
        },
        undefined,
        FLYOUT_SESSION_KIND.INHERIT
      );
    },
    [data, documentFlyoutProperties, http, open]
  );

  return useMemo(() => ({ openAlert, openAttack }), [openAlert, openAttack]);
};
