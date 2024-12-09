/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ReactNode } from 'react';
import type {
  UsageCollectionSetup,
  UsageCollectionStart,
} from '@kbn/usage-collection-plugin/public';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SessionViewPluginSetup {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SessionViewPluginStart {}

export interface SessionViewPluginStartDeps {
  usageCollection?: UsageCollectionStart;
}

export interface SessionViewPluginSetupDeps {
  usageCollection?: UsageCollectionSetup;
}

export type SessionViewIndices = 'endpoint' | 'cloud_defend' | 'auditbeat';

// the following are all the reportUiCounter click tracking events we send up.
export type SessionViewTelemetryKey =
  | 'loaded_from_auditbeat_log'
  | 'loaded_from_auditbeat_alert'
  | 'loaded_from_cloud_defend_log'
  | 'loaded_from_cloud_defend_alert'
  | 'loaded_from_endpoint_log'
  | 'loaded_from_endpoint_alert'
  | 'loaded_from_unknown_log'
  | 'loaded_from_unknown_alert'
  | 'refresh_clicked'
  | 'process_selected'
  | 'collapse_tree'
  | 'children_opened'
  | 'children_closed'
  | 'alerts_opened'
  | 'alerts_closed'
  | 'details_opened'
  | 'details_closed'
  | 'output_clicked'
  | 'alert_details_loaded'
  | 'disabled_tty_clicked' // tty button clicked when disabled (no data or not enabled)
  | 'tty_loaded' // tty player succesfully loaded
  | 'tty_playback_started'
  | 'tty_playback_stopped'
  | 'verbose_mode_enabled'
  | 'verbose_mode_disabled'
  | 'timestamp_enabled'
  | 'timestamp_disabled'
  | 'search_performed'
  | 'search_next'
  | 'search_previous';

export interface SessionViewDeps {
  // we pass in the index of the session leader that spawned session_view, this avoids having to query multiple cross cluster indices
  index: string;

  // the root node of the process tree to render. e.g process.entry.entity_id or process.session_leader.entity_id
  sessionEntityId: string;

  // start time is passed in order to scope session_view queries to the appropriate time range, and avoid querying data across all time.
  sessionStartTime: string;

  height?: number;
  isFullScreen?: boolean;
  // if provided, the session view will jump to and select the provided event if it belongs to the session leader
  // session view will fetch a page worth of events starting from jumpToEvent as well as a page backwards.
  jumpToEntityId?: string;
  jumpToCursor?: string;

  // when loading session viewer from an alert, this prop can be set to add extra UX to keep the focus on the alert
  investigatedAlertId?: string;
  // Callback to open the alerts flyout
  loadAlertDetails?: (
    alertUuid: string,
    // Callback used when alert flyout panel is closed
    handleOnAlertDetailsClosed: () => void
  ) => void;
  canReadPolicyManagement?: boolean;
}

export interface EuiTabProps {
  id: string;
  name: string;
  content: ReactNode;
  disabled?: boolean;
  append?: ReactNode;
  prepend?: ReactNode;
}

export interface DetailPanelProcess {
  id: string;
  start: string;
  end: string;
  exitCode: string;
  userId: string;
  userName: string;
  groupId: string;
  groupName: string;
  args: string;
  executable: string[][];
  workingDirectory: string;
  interactive: string;
  pid: string;
  entryLeader: DetailPanelProcessLeader;
  sessionLeader: DetailPanelProcessLeader;
  groupLeader: DetailPanelProcessLeader;
  parent: DetailPanelProcessLeader;
}

export interface DetailPanelProcessLeader {
  id: string;
  name: string;
  start: string;
  end: string;
  exitCode: string;
  userId: string;
  userName: string;
  groupId: string;
  groupName: string;
  workingDirectory: string;
  interactive: string;
  args: string;
  pid: string;
  entryMetaType: string;
  entryMetaSourceIp: string;
  executable: string[][];
}

export interface DetailPanelHost {
  architecture: string;
  hostname: string;
  id: string;
  ip: string;
  mac: string;
  name: string;
  os: {
    family: string;
    full: string;
    kernel: string;
    name: string;
    platform: string;
    version: string;
  };
}

export interface DetailPanelContainer {
  id: string;
  name: string;
  image: {
    name: string;
    tag: string;
    hash: {
      all: string;
    };
  };
}

export interface DetailPanelOrchestrator {
  resource: {
    name: string;
    type: string;
    ip: string;
    parent: {
      type: string;
    };
  };
  namespace: string;
  cluster: {
    name: string;
    id: string;
  };
}

export interface DetailPanelCloud {
  instance: {
    name: string;
  };
  account: {
    id: string;
  };
  project: {
    id: string;
    name: string;
  };
  provider: string;
  region: string;
}

export interface SessionViewStart {
  getSessionView: (props: SessionViewDeps) => JSX.Element;
}
