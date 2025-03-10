/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiDescriptionList } from '@elastic/eui';
import type { RuleExecutionEvent } from '../../../../../common/api/detection_engine/rule_monitoring';
import { TextBlock } from '../basic/text/text_block';

import * as i18n from './translations';

interface ExecutionEventsTableRowDetailsProps {
  item: RuleExecutionEvent;
}

const ExecutionEventsTableRowDetailsComponent: React.FC<ExecutionEventsTableRowDetailsProps> = ({
  item,
}) => {
  return (
    <EuiDescriptionList
      className="eui-fullWidth"
      listItems={[
        {
          title: i18n.ROW_DETAILS_MESSAGE,
          description: <TextBlock text={item.message} />,
        },
        {
          title: i18n.ROW_DETAILS_JSON,
          description: <TextBlock text={JSON.stringify(item, null, 2)} />,
        },
      ]}
    />
  );
};

export const ExecutionEventsTableRowDetails = React.memo(ExecutionEventsTableRowDetailsComponent);
ExecutionEventsTableRowDetails.displayName = 'ExecutionEventsTableRowDetails';
