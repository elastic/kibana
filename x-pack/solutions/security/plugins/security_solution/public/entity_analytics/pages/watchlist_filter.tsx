
import React, { useState, useCallback } from 'react';
import {
  EuiIcon,

  EuiComboBox,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';

import { useNavigation } from '../../common/lib/kibana';
import { ENTITY_ANALYTICS_PRIVILEGED_USER_MONITORING_PATH } from '../../../common/constants';

type WatchlistGroupLabel = {
  id: string;
  label: string;
  isGroupLabelOption: true;
  groupicon: string;
  prepend?: React.ReactNode;
  checked?: never;
};

type WatchlistItem = {
  id: string;
  label: string;
  isGroupLabelOption?: false;
  checked?: 'on' | 'off';
  groupicon?: never;
};

type WatchlistOption = WatchlistGroupLabel | WatchlistItem;

type WatchlistFilterProps = {
  onChangeSelectedId?: (id: string) => void;
};

// Demo atm, replacing with real data with crud
const WATCHLIST_OPTIONS: WatchlistOption[] = [
  { prepend: <EuiIcon type="pin" aria-label="pin" style={{ marginRight: 8 }}/>, id: 'group-prebuilt', label: 'Prebuilt', isGroupLabelOption: true, groupicon: 'pin' },
  { id: 'prebuilt-priv', label: 'Privileged users' },
  { id: 'prebuilt-llm', label: 'Unauthorized LLM access' },
  { id: 'prebuilt-depart', label: 'Departing employees' },

  { prepend: <EuiIcon type="gear" aria-label="gear" style={{ marginRight: 8 }}/> , id: 'group-custom', label: 'Custom', isGroupLabelOption: true, groupicon: 'gear' },
  { id: 'custom-clevel', label: 'C-level users' },
  { id: 'custom-highrisk', label: 'High-risk users' },
  { id: 'custom-3', label: 'Custom watchlist #3' },
];

export const WatchlistFilter = ({ onChangeSelectedId }: WatchlistFilterProps) => {

  // hook this up to real data
  const [options, setOptions] = useState<WatchlistOption[]>(WATCHLIST_OPTIONS);
 
  const selected = options.find((o) => !o.isGroupLabelOption && o.checked === 'on');

  const { navigateTo } = useNavigation();  

  const navigateToWatchlist = useCallback(
    () => {      
      navigateTo({
        path: ENTITY_ANALYTICS_PRIVILEGED_USER_MONITORING_PATH
      });
    },
    [navigateTo]
  );

  const onChangeComboBox = useCallback(
    (nextOptions: any[]) => {      
      const newlySelected = nextOptions.find(
        (o) => o && !o.isGroupLabelOption
      ) as WatchlistItem | undefined;

      if (newlySelected?.id) {        
        onChangeSelectedId?.(newlySelected.id);        
        navigateToWatchlist();        
      }
    },
    [onChangeSelectedId, navigateToWatchlist]
  );

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center">
      <EuiFlexItem>
        <EuiComboBox
          prepend="Watchlist"
          placeholder='Select watchlist'
          singleSelection={{ asPlainText: true }}
          options={options}
          selectedOptions={selected ? [selected] : []}
          onChange={onChangeComboBox}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonIcon
          iconType="gear"
          aria-label="Watchlist settings"
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  )
};