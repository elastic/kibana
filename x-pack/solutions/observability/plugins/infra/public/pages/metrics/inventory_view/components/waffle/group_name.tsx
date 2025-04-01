/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiScreenReaderOnly, EuiToolTip, useEuiFontSize } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import styled from '@emotion/styled';
import type {
  InfraWaffleMapGroup,
  InfraWaffleMapOptions,
} from '../../../../../common/inventory/types';

interface Props {
  onDrilldown: (filter: string) => void;
  group: InfraWaffleMapGroup;
  isChild?: boolean;
  options: InfraWaffleMapOptions;
}

export class GroupName extends React.PureComponent<Props, { a11yAnnouncement: string }> {
  constructor(props: Props) {
    super(props);
    this.state = { a11yAnnouncement: '' };
  }

  public render() {
    const { group, isChild } = this.props;
    const { a11yAnnouncement } = this.state;
    const buttonStyle = {
      fontSize: isChild ? '0.85em' : '1em',
    };

    return (
      <>
        <EuiScreenReaderOnly>
          <div aria-live="polite" role="status">
            {a11yAnnouncement}
          </div>
        </EuiScreenReaderOnly>

        <GroupNameContainer>
          <Inner isChild={isChild}>
            <Name>
              <EuiToolTip position="top" content={group.name}>
                <EuiButtonEmpty
                  aria-label={i18n.translate('xpack.infra.inventory.groupBySelectorButtonLabel', {
                    defaultMessage: 'Group by {group}',
                    values: { group: group.name },
                  })}
                  style={buttonStyle}
                  onClick={this.handleClick}
                  data-test-subj="groupNameButton"
                >
                  {group.name}
                </EuiButtonEmpty>
              </EuiToolTip>
            </Name>
            <Count>{group.count}</Count>
          </Inner>
        </GroupNameContainer>
      </>
    );
  }

  private handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    const {
      options: { groupBy },
      group,
    } = this.props;

    if (groupBy.length === 0) {
      this.setState(
        {
          a11yAnnouncement: i18n.translate('xpack.infra.inventory.groupBy.noChangeMessage', {
            defaultMessage: 'No changes were made when selecting {group}.',
            values: { group: group.name },
          }),
        },
        () => {
          // Clear the message after a short delay to ensure it gets announced
          setTimeout(() => this.setState({ a11yAnnouncement: '' }), 2000);
        }
      );
      return;
    }

    this.setState(
      {
        a11yAnnouncement: i18n.translate('xpack.infra.inventory.groupBy.grouppingByMessage', {
          defaultMessage: 'Groupping by {group}...',
          values: { group: group.name },
        }),
      },
      () => {
        setTimeout(() => {
          const currentPath = this.props.isChild && groupBy.length > 1 ? groupBy[1] : groupBy[0];
          this.props.onDrilldown(`${currentPath.field}: "${group.name}"`);
          this.setState({ a11yAnnouncement: '' });
        }, 500);
      }
    );
  };
}

const GroupNameContainer = styled.div`
  position: relative;
  text-align: center;
  font-size: ${(props) => useEuiFontSize('m').fontSize};
  margin-bottom: 5px;
  top: 20px;
  display: flex;
  justify-content: center;
  padding: 0 10px;
`;

interface InnerProps {
  isChild?: boolean;
}

const Inner = styled.div<InnerProps>`
  border: ${(props) => props.theme.euiTheme.border.thin};
  background-color: ${(props) =>
    props.isChild
      ? props.theme.euiTheme.colors.lightestShade
      : props.theme.euiTheme.colors.emptyShade};
  border-radius: 4px;
  box-shadow: 0px 2px 0px 0px ${(props) => props.theme.euiTheme.border.color};
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
`;

const Name = styled.div`
  flex: 1 1 auto;
  padding: 6px 10px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Count = styled.div`
  flex: 0 0 auto;
  border-left: ${(props) => props.theme.euiTheme.border.thin};
  padding: 6px 10px;
  font-size: ${() => useEuiFontSize('xs').fontSize};
  font-weight: normal;
`;
