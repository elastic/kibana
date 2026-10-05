/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { RunWorkflowPanel } from '@kbn/workflows-ui';
import type { DataTableRecord } from '@kbn/discover-utils';

export interface EpisodeWorkflowsPanelProps {
  record: DataTableRecord;
  onClose: () => void;
}

/**
 * The workflow-selector panel for an episode. We pass the episode's identifiers as plain run inputs
 * (referenced in the workflow YAML as `{{ inputs.group_hash }}` / `{{ inputs.episode_id }}`), so the
 * episode steps can target the actual clicked row.
 *
 * We deliberately do NOT use the `event.triggerType: 'alert'` input shape: that makes the engine run
 * `preprocessAlertInputs`, which extracts `kibana.alert.rule.*` from the ids and fails on an episode
 * (it's not a detection alert). So workflows here use a `manual` trigger and read these inputs.
 */
export const EpisodeWorkflowsPanel = ({ record, onClose }: EpisodeWorkflowsPanelProps) => {
  const inputs = useMemo(
    () => ({
      group_hash: String(record.flattened.group_hash ?? ''),
      episode_id: String(record.flattened['episode.id'] ?? ''),
      rule_id: String(record.flattened['rule.id'] ?? ''),
      status: String(record.flattened['episode.status'] ?? ''),
    }),
    [record.flattened]
  );

  return <RunWorkflowPanel inputs={inputs} onClose={onClose} />;
};
