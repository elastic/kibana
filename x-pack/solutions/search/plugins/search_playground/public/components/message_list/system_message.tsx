/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiComment, EuiLink, EuiText, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { docLinks } from '../../../common/doc_links';
import { ContextModelLimitError } from '../../../common';

interface SystemMessageProps {
  content: React.ReactNode;
}

export const SystemMessage: React.FC<SystemMessageProps> = ({ content }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiComment
      username={i18n.translate('xpack.searchPlayground.chat.message.system.username', {
        defaultMessage: 'system',
      })}
      timelineAvatarAriaLabel={i18n.translate(
        'xpack.searchPlayground.chat.message.system.avatarAriaLabel',
        {
          defaultMessage: 'System',
        }
      )}
      event={
        content === ContextModelLimitError ? (
          <EuiText size="s">
            <p>
              <FormattedMessage
                id="xpack.searchPlayground.chat.message.system.contextModelLimitError"
                defaultMessage="{SystemMessage}: Try reducing the number of selected documents and fields to stay within context limits. {LearnMore}"
                values={{
                  SystemMessage: content,
                  LearnMore: (
                    <EuiLink
                      href={docLinks.context}
                      target="_blank"
                      data-test-subj="system-contentModelLimit-learnMore-documentation-link"
                    >
                      <FormattedMessage
                        id="xpack.searchPlayground.chat.message.system.contextModelLimitError.LearnMore"
                        defaultMessage="Learn more"
                      />
                    </EuiLink>
                  ),
                }}
              />
            </p>
          </EuiText>
        ) : (
          content
        )
      }
      timelineAvatar="dot"
      eventColor="subdued"
      css={{
        '.euiAvatar': { backgroundColor: euiTheme.colors.emptyShade },
        '.euiCommentEvent': {
          border: euiTheme.border.thin,
          borderRadius: euiTheme.border.radius.medium,
        },
      }}
      data-test-subj="systemMessage"
    />
  );
};
