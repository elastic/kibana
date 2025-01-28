/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type {
  BulkActionEditPayload,
  BulkActionEditType,
} from '../../../../../../common/api/detection_engine/rule_management';
import { BulkActionEditTypeEnum } from '../../../../../../common/api/detection_engine/rule_management';

import { IndexPatternsForm } from './forms/index_patterns_form';
import { TagsForm } from './forms/tags_form';
import { TimelineTemplateForm } from './forms/timeline_template_form';
import { RuleActionsForm } from './forms/rule_actions_form';
import { ScheduleForm } from './forms/schedule_form';
import { InvestigationFieldsForm } from './forms/investigation_fields_form';

interface BulkEditFlyoutProps {
  onClose: () => void;
  onConfirm: (bulkActionEditPayload: BulkActionEditPayload) => void;
  editAction: BulkActionEditType;
  rulesCount: number;
}

const BulkEditFlyoutComponent = ({ editAction, ...props }: BulkEditFlyoutProps) => {
  switch (editAction) {
    case BulkActionEditTypeEnum.add_index_patterns:
    case BulkActionEditTypeEnum.delete_index_patterns:
    case BulkActionEditTypeEnum.set_index_patterns:
      return <IndexPatternsForm {...props} editAction={editAction} />;

    case BulkActionEditTypeEnum.add_tags:
    case BulkActionEditTypeEnum.delete_tags:
    case BulkActionEditTypeEnum.set_tags:
      return <TagsForm {...props} editAction={editAction} />;

    case BulkActionEditTypeEnum.add_investigation_fields:
    case BulkActionEditTypeEnum.delete_investigation_fields:
    case BulkActionEditTypeEnum.set_investigation_fields:
      return <InvestigationFieldsForm {...props} editAction={editAction} />;

    case BulkActionEditTypeEnum.set_timeline:
      return <TimelineTemplateForm {...props} />;

    case BulkActionEditTypeEnum.add_rule_actions:
    case BulkActionEditTypeEnum.set_rule_actions:
      return <RuleActionsForm {...props} />;
    case BulkActionEditTypeEnum.set_schedule:
      return <ScheduleForm {...props} />;

    default:
      return null;
  }
};

export const BulkEditFlyout = React.memo(BulkEditFlyoutComponent);

BulkEditFlyout.displayName = 'BulkEditFlyout';
