/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiScreenReaderOnly, EuiToolTip } from '@elastic/eui';
import React, { useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import type { InventoryItemType } from '@kbn/metrics-data-access-plugin/common';
import type {
  InfraWaffleMapGroup,
  InfraWaffleMapOptions,
} from '../../../../../common/inventory/types';

interface Props {
  onDrilldown: (filter: string) => void;
  group: InfraWaffleMapGroup;
  isChild?: boolean;
  options: InfraWaffleMapOptions;
  nodeType: InventoryItemType;
}

export const GroupName: React.FC<Props> = ({ onDrilldown, group, isChild, options, nodeType }) => {
  const [a11yAnnouncement, setA11yAnnouncement] = useState('');

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();

      if (options.groupBy.length === 0) {
        setA11yAnnouncement(
          i18n.translate('xpack.infra.inventory.groupBy.noChangeMessage', {
            defaultMessage: 'No changes were made when selecting {group}.',
            values: { group: group.name },
          })
        );
        return;
      }

      setA11yAnnouncement(
        i18n.translate('xpack.infra.inventory.groupBy.groupingByMessage', {
          defaultMessage: 'Grouping by {group}...',
          values: { group: group.name },
        })
      );

      const currentPath =
        isChild && options.groupBy.length > 1 ? options.groupBy[1] : options.groupBy[0];
      onDrilldown(`${currentPath.field}: "${group.name}"`);
    },
    [group.name, isChild, onDrilldown, options.groupBy]
  );

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
                aria-label={i18n.translate(
                  'xpack.infra.inventory.groupBySelectorButton.ariaLabel',
                  {
                    defaultMessage: 'Group by {group}',
                    values: { group: group.name },
                  }
                )}
                css={buttonStyle}
                onClick={handleClick}
                data-test-subj="groupNameButton"
              >
                {group.name}
              </EuiButtonEmpty>
            </EuiToolTip>
          </Name>
          <Count
            aria-label={i18n.translate('xpack.infra.inventory.groupByCount.ariaLabel', {
              defaultMessage: '{count} {nodeType} in this group',
              values: { nodeType, count: group.count },
            })}
          >
            {group.count}
          </Count>
        </Inner>
      </GroupNameContainer>
    </>
  );
};

const GroupNameContainer = euiStyled.div`
  position: relative;
  text-align: center;
  font-size: 16px;
  margin-bottom: 5px;
  top: 20px;
  display: flex;
  justify-content: center;
  padding: 0 10px;
`;

interface InnerProps {
  isChild?: boolean;
}

const Inner = euiStyled.div<InnerProps>`
  border: 1px solid ${(props) => props.theme.eui.euiBorderColor};
  background-color: ${(props) =>
    props.isChild ? props.theme.eui.euiColorLightestShade : props.theme.eui.euiColorEmptyShade};
  border-radius: 4px;
  box-shadow: 0px 2px 0px 0px ${(props) => props.theme.eui.euiBorderColor};
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
`;

const Name = euiStyled.div`
  flex: 1 1 auto;
  padding: 6px 10px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Count = euiStyled.div`
  flex: 0 0 auto;
  border-left: 1px solid ${(props) => props.theme.eui.euiBorderColor};
  padding: 6px 10px;
  font-size: 0.85em;
  font-weight: normal;
`;
