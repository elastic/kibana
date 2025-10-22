/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useHistory } from 'react-router-dom';
import { TagsList } from '@kbn/observability-shared-plugin/public';
import { EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { MonitorTypeBadge } from '../../../../common/components/monitor_type_badge';
import * as labels from '../../../management/monitor_list_table/labels';
import type { OverviewStatusMetaData } from '../../../../../../../../common/runtime_types';

export const MetricItemBody = ({ monitor }: { monitor: OverviewStatusMetaData }) => {
  const tags = monitor.tags;
  const history = useHistory();

  const typeBadge = (
    <MonitorTypeBadge
      monitorType={monitor.type}
      ariaLabel={labels.getFilterForTypeMessage(monitor.type)}
      onClick={() => {
        history.push({
          search: `monitorTypes=${encodeURIComponent(JSON.stringify([monitor.type]))}`,
        });
      }}
    />
  );
  if (tags.length === 0) {
    return (
      <>
        <EuiSpacer size="xs" />
        {typeBadge}
      </>
    );
  }

  return (
    <>
      <EuiSpacer size="xs" />
      {(tags ?? []).length > 0 && (
        <TagsList
          prependChildren={<EuiFlexItem grow={false}>{typeBadge}</EuiFlexItem>}
          color="default"
          tags={tags}
          disableExpand={true}
          onClick={(tag) => {
            history.push({ search: `tags=${encodeURIComponent(JSON.stringify([tag]))}` });
          }}
        />
      )}
    </>
  );
};
