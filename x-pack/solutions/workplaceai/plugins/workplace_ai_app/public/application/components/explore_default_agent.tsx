/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiPanel,
  EuiTitle,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiTextArea,
  EuiButtonEmpty,
  EuiButtonIcon,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../hooks/use_kibana';

export const ExploreDefaultAgent: React.FC = () => {
  const {
    services: { application },
  } = useKibana();
  const [chatInput, setChatInput] = useState('');

  const handleSubmit = () => {
    if (chatInput.trim() === '') {
      return;
    }

    // Navigate to Agent Builder with the message in location state
    application.navigateToApp('agent_builder', {
      path: '/conversations/new',
      state: {
        initialMessage: chatInput.trim(),
      },
    });
  };

  return (
    <EuiPanel paddingSize="l">
      <EuiTitle size="s">
        <h5>
          <FormattedMessage
            id="xpack.workplaceai.gettingStarted.exploreDefaultAgent.title"
            defaultMessage="Explore default Elastic agent"
          />
        </h5>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiPanel paddingSize="s" hasShadow={false} hasBorder>
        {/* Add context button */}
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButton size="s" iconType="at" color="text" onClick={() => {}}>
              <FormattedMessage
                id="xpack.workplaceai.gettingStarted.exploreDefaultAgent.addContextButtonLabel"
                defaultMessage="Add context"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="m" />

        {/* Input text area */}
        <EuiTextArea
          placeholder={i18n.translate(
            'xpack.workplaceai.gettingStarted.exploreDefaultAgent.chatInputPlaceholder',
            {
              defaultMessage: 'How can I help you today?',
            }
          )}
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          rows={3}
          resize="none"
          fullWidth
          style={{ border: 'none', boxShadow: 'none', padding: 0 }}
        />

        <EuiSpacer size="m" />

        {/* Bottom row: Modify and Tools on left, Submit arrow on right */}
        <EuiFlexGroup
          gutterSize="s"
          responsive={false}
          alignItems="center"
          justifyContent="spaceBetween"
        >
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  size="m"
                  iconType="link"
                  color="text"
                  iconSize="m"
                  onClick={() => {}}
                  aria-label={i18n.translate(
                    'xpack.workplaceai.gettingStarted.exploreDefaultAgent.shareLinkAriaLabel',
                    {
                      defaultMessage: 'Share link',
                    }
                  )}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  size="m"
                  iconType="pencil"
                  color="text"
                  iconSize="m"
                  iconSide="left"
                  onClick={() => {}}
                >
                  <FormattedMessage
                    id="xpack.workplaceai.gettingStarted.exploreDefaultAgent.modifyButtonLabel"
                    defaultMessage="Modify"
                  />
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  size="m"
                  iconType="grid"
                  color="text"
                  iconSize="m"
                  iconSide="left"
                  onClick={() => {}}
                >
                  <FormattedMessage
                    id="xpack.workplaceai.gettingStarted.exploreDefaultAgent.toolsButtonLabel"
                    defaultMessage="Tools"
                  />
                </EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              iconType="arrowUp"
              aria-label={i18n.translate(
                'xpack.workplaceai.gettingStarted.exploreDefaultAgent.submitAriaLabel',
                {
                  defaultMessage: 'Submit',
                }
              )}
              color="primary"
              display="fill"
              size="m"
              disabled={chatInput.trim() === ''}
              onClick={handleSubmit}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </EuiPanel>
  );
};
