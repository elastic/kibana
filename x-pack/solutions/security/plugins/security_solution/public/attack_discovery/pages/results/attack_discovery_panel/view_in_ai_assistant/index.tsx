/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttackDiscovery, AttackDiscoveryAlert, Replacements } from '@kbn/elastic-assistant-common';
import { EuiButton, EuiButtonEmpty, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';

import { AssistantIcon } from '@kbn/ai-assistant-icon';
import * as i18n from './translations';
import { useViewInAiAssistant, type ViewInAiAssistantOverlay } from './use_view_in_ai_assistant';

interface ViewInAiAssistantViewProps {
  compact: boolean;
  disabled: boolean;
  showAssistantOverlay: () => void;
}

const ViewInAiAssistantView: React.FC<ViewInAiAssistantViewProps> = ({
  compact,
  disabled,
  showAssistantOverlay,
}) =>
  compact ? (
    <EuiButtonEmpty
      data-test-subj="viewInAiAssistantCompact"
      disabled={disabled}
      iconType="maximize"
      onClick={showAssistantOverlay}
      size="xs"
    >
      {i18n.VIEW_IN_AI_ASSISTANT}
    </EuiButtonEmpty>
  ) : (
    <EuiButton
      data-test-subj="viewInAiAssistant"
      disabled={disabled}
      onClick={showAssistantOverlay}
      size="s"
    >
      <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false} wrap={false}>
        <EuiFlexItem data-test-subj="assistantAvatar" grow={false}>
          <AssistantIcon size="m" />
        </EuiFlexItem>
        <EuiFlexItem data-test-subj="viewInAiAssistantLabel" grow={false}>
          {i18n.VIEW_IN_AI_ASSISTANT}
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiButton>
  );

ViewInAiAssistantView.displayName = 'ViewInAiAssistantView';

export type { ViewInAiAssistantOverlay };

interface Props {
  attackDiscovery: AttackDiscovery | AttackDiscoveryAlert;
  compact?: boolean;
  replacements?: Replacements;
  /**
   * When set (e.g. from `AttackDiscoveryPanel`), uses this state instead of calling
   * `useViewInAiAssistant` so only one `useAssistantOverlay` exists per discovery id.
   */
  viewInAiAssistantOverlay?: ViewInAiAssistantOverlay;
}

const ViewInAiAssistantWithHook: React.FC<Props> = ({ compact = false, ...rest }) => {
  const overlay = useViewInAiAssistant({
    attackDiscovery: rest.attackDiscovery,
    replacements: rest.replacements,
  });
  return (
    <ViewInAiAssistantView
      compact={compact}
      disabled={overlay.disabled}
      showAssistantOverlay={overlay.showAssistantOverlay}
    />
  );
};

const ViewInAiAssistantWithInjectedOverlay: React.FC<Props> = ({
  compact = false,
  viewInAiAssistantOverlay: overlay,
}) => {
  if (overlay == null) {
    return null;
  }
  return (
    <ViewInAiAssistantView
      compact={compact}
      disabled={overlay.disabled}
      showAssistantOverlay={overlay.showAssistantOverlay}
    />
  );
};

const ViewInAiAssistantComponent: React.FC<Props> = (props) => {
  if (props.viewInAiAssistantOverlay != null) {
    return <ViewInAiAssistantWithInjectedOverlay {...props} />;
  }
  return <ViewInAiAssistantWithHook {...props} />;
};

ViewInAiAssistantComponent.displayName = 'ViewInAiAssistant';

export const ViewInAiAssistant = React.memo(ViewInAiAssistantComponent);
