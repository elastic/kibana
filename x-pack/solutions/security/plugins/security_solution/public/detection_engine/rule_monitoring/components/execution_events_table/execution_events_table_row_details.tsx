/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCodeBlock, EuiDescriptionList } from '@elastic/eui';
import { type RuleExecutionEvent } from '../../../../../common/api/detection_engine/rule_monitoring';

import * as i18n from './translations';

interface ExecutionEventsTableDetailsCellProps {
  item: RuleExecutionEvent;
}

const ExecutionEventsTableDetailsCellComponent: React.FC<ExecutionEventsTableDetailsCellProps> = ({
  item,
}) => {
  const listItems = [];

  if (item.message) {
    listItems.push({
      title: i18n.EVENT_MESSAGE,
      description: (
        <EuiCodeBlock
          isCopyable={true}
          language="text"
          overflowHeight={200}
          paddingSize="s"
          data-test-subj="executionEventsTable-eventMessage"
        >
          {item.message}
        </EuiCodeBlock>
      ),
    });
  }

  if (item?.details?.metrics) {
    listItems.push({
      title: i18n.METRICS,
      description: (
        <EuiCodeBlock isCopyable={true} language="text" paddingSize="s">
          {JSON.stringify(item.details.metrics, null, 2)}
        </EuiCodeBlock>
      ),
    });
  }

  listItems.push({
    title: i18n.RULE_EXECUTION_ID,
    description: (
      <EuiCodeBlock isCopyable={true} language="text" paddingSize="s">
        {item.execution_id}
      </EuiCodeBlock>
    ),
  });
  return (
    <EuiDescriptionList
      data-test-subj="executionEventsTable-eventDetails"
      className="eui-fullWidth"
      listItems={listItems}
    />
  );
};

export const ExecutionEventsTableDetailsCell = React.memo(ExecutionEventsTableDetailsCellComponent);
ExecutionEventsTableDetailsCell.displayName = 'ExecutionEventsTableDetailsCell';
