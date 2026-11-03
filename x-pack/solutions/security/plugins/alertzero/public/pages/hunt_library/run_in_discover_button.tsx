/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useRef } from 'react';
import { EuiButton, EuiToolTip } from '@elastic/eui';
import type { CoreStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import { v4 as uuidv4 } from 'uuid';
import type { HuntLibraryDetail } from '../../../common/hunt_library';
import { buildDiscoverEsqlUrl } from '../../agent_builder/attachment_types/navigation/discover_urls';
import { useLaunchHunt } from '../../hooks/use_launch_hunt';
import { ALERTZERO_UI_EVENTS, useAlertZeroTelemetry } from '../../telemetry';
import * as i18n from './translations';

interface RunInDiscoverButtonProps {
  hunt: HuntLibraryDetail;
}

/**
 * Records an exploratory manual session, then opens the hunt's query in Discover. The session id is
 * minted once per attempt and kept until the launch succeeds, so a retry after a failure or a
 * double click records one session, not two.
 */
export const RunInDiscoverButton: React.FC<RunInDiscoverButtonProps> = ({ hunt }) => {
  const { services } = useKibana<CoreStart & { share?: SharePluginStart }>();
  const { mutateAsync, isLoading } = useLaunchHunt();
  const { reportEvent } = useAlertZeroTelemetry();
  const attempt = useRef<{ huntId: string; sessionId: string } | undefined>();

  const { available } = hunt.callerAvailability;
  const discoverUrl = buildDiscoverEsqlUrl({
    share: services.share,
    esql: hunt.query.query,
    timeRange: hunt.query.defaultTimeRange,
  });
  const disabledReason = !available
    ? i18n.RUN_DISABLED_UNAVAILABLE
    : !discoverUrl
    ? i18n.RUN_DISABLED_NO_DISCOVER
    : undefined;

  const run = async () => {
    if (!discoverUrl) return;
    if (attempt.current?.huntId !== hunt.id) {
      attempt.current = { huntId: hunt.id, sessionId: uuidv4() };
    }
    try {
      await mutateAsync({ huntId: hunt.id, sessionId: attempt.current.sessionId });
    } catch {
      services.notifications?.toasts.addDanger({ title: i18n.RUN_ERROR_TITLE });
      return;
    }
    attempt.current = undefined;
    reportEvent(ALERTZERO_UI_EVENTS.HuntLaunched, { hunt_id: hunt.id });
    await services.application?.navigateToUrl(discoverUrl);
  };

  const button = (
    <EuiButton
      fill
      iconType="discoverApp"
      isDisabled={disabledReason !== undefined}
      isLoading={isLoading}
      onClick={run}
      data-test-subj="alertZeroHuntRunInDiscover"
    >
      {i18n.RUN_IN_DISCOVER}
    </EuiButton>
  );

  return disabledReason ? <EuiToolTip content={disabledReason}>{button}</EuiToolTip> : button;
};
