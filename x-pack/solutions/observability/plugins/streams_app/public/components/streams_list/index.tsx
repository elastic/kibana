/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiSwitch,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
import { euiThemeVars } from '@kbn/ui-theme';
import { css } from '@emotion/css';
import { StreamDefinition, isWiredStream } from '@kbn/streams-schema';
import { useStreamsAppRouter } from '../../hooks/use_streams_app_router';
import { NestedView } from '../nested_view';
import { useKibana } from '../../hooks/use_kibana';
import { getIndexPatterns } from '../../util/hierarchy_helpers';

export interface StreamTree {
  id: string;
  type: 'wired' | 'root' | 'classic';
  definition: StreamDefinition;
  children: StreamTree[];
}

function asTrees(definitions: StreamDefinition[]) {
  const trees: StreamTree[] = [];
  const wiredDefinitions = definitions.filter((definition) => isWiredStream(definition));
  wiredDefinitions.sort((a, b) => a.name.split('.').length - b.name.split('.').length);

  wiredDefinitions.forEach((definition) => {
    let currentTree = trees;
    let existingNode: StreamTree | undefined;
    // traverse the tree following the prefix of the current id.
    // once we reach the leaf, the current id is added as child - this works because the ids are sorted by depth
    while ((existingNode = currentTree.find((node) => definition.name.startsWith(node.id)))) {
      currentTree = existingNode.children;
    }
    if (!existingNode) {
      const newNode: StreamTree = {
        id: definition.name,
        children: [],
        definition,
        type: definition.name.split('.').length === 1 ? 'root' : 'wired',
      };
      currentTree.push(newNode);
    }
  });

  return trees;
}

export function StreamsList({
  definitions,
  query,
  showControls,
}: {
  definitions: StreamDefinition[] | undefined;
  query?: string;
  showControls: boolean;
}) {
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});
  const [showClassic, setShowClassic] = React.useState(true);
  const items = useMemo(() => {
    return definitions ?? [];
  }, [definitions]);

  const filteredItems = useMemo(() => {
    return items
      .filter((item) => showClassic || isWiredStream(item))
      .filter((item) => !query || item.name.toLowerCase().includes(query.toLowerCase()));
  }, [query, items, showClassic]);

  const classicStreams = useMemo(() => {
    return filteredItems.filter((item) => !isWiredStream(item));
  }, [filteredItems]);

  const treeView = useMemo(() => {
    const trees = asTrees(filteredItems);
    const classicList = classicStreams.map((definition) => ({
      id: definition.name,
      type: 'classic' as const,
      definition,
      children: [],
    }));
    return [...trees, ...classicList];
  }, [filteredItems, classicStreams]);

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      {showControls && (
        <>
          <EuiTitle size="xxs">
            <h2>
              {i18n.translate('xpack.streams.streamsTable.tableTitle', {
                defaultMessage: 'Streams',
              })}
            </h2>
          </EuiTitle>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="m" justifyContent="spaceBetween">
              {Object.keys(collapsed).length === 0 ? (
                <EuiButtonEmpty
                  iconType="fold"
                  size="s"
                  onClick={() =>
                    setCollapsed(Object.fromEntries(items.map((item) => [item.name, true])))
                  }
                >
                  {i18n.translate('xpack.streams.streamsTable.collapseAll', {
                    defaultMessage: 'Collapse all',
                  })}
                </EuiButtonEmpty>
              ) : (
                <EuiButtonEmpty iconType="unfold" onClick={() => setCollapsed({})} size="s">
                  {i18n.translate('xpack.streams.streamsTable.expandAll', {
                    defaultMessage: 'Expand all',
                  })}
                </EuiButtonEmpty>
              )}
              <EuiSwitch
                label={i18n.translate('xpack.streams.streamsTable.showClassicStreams', {
                  defaultMessage: 'Show classic streams',
                })}
                compressed
                checked={showClassic}
                onChange={(e) => setShowClassic(e.target.checked)}
              />
            </EuiFlexGroup>
          </EuiFlexItem>
        </>
      )}
      <EuiFlexItem grow={false}>
        {treeView.map((tree) => (
          <StreamNode key={tree.id} node={tree} collapsed={collapsed} setCollapsed={setCollapsed} />
        ))}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

function StreamNode({
  node,
  collapsed,
  setCollapsed,
}: {
  node: StreamTree;
  collapsed: Record<string, boolean>;
  setCollapsed: (collapsed: Record<string, boolean>) => void;
}) {
  const router = useStreamsAppRouter();
  const {
    dependencies: {
      start: { share },
    },
  } = useKibana();
  const discoverLocator = useMemo(
    () => share.url.locators.get('DISCOVER_APP_LOCATOR'),
    [share.url.locators]
  );

  const discoverUrl = useMemo(() => {
    const indexPatterns = getIndexPatterns(node.definition);

    if (!discoverLocator || !indexPatterns) {
      return undefined;
    }

    return discoverLocator.getRedirectUrl({
      query: {
        esql: `FROM ${indexPatterns.join(', ')}`,
      },
    });
  }, [discoverLocator, node]);

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="xs"
      className={css`
        margin-top: ${euiThemeVars.euiSizeXS};
        margin-left: ${euiThemeVars.euiSizeS};
      `}
    >
      <EuiFlexGroup
        direction="row"
        gutterSize="s"
        alignItems="center"
        className={css`
          padding: ${euiThemeVars.euiSizeXS};
          border-radius: ${euiThemeVars.euiBorderRadius};
          &:hover {
            background-color: ${euiThemeVars.euiColorLightestShade};
            .links {
              opacity: 1;
            }
          }
        `}
      >
        {node.children.length > 0 && (
          // Using a regular button here instead of the EUI one to control styling
          <button
            type="button"
            onClick={() => {
              setCollapsed?.({ ...collapsed, [node.id]: !collapsed?.[node.id] });
            }}
            className={css`
              background: none;
              margin-left: -${euiThemeVars.euiSizeXS};
              margin-right: ${euiThemeVars.euiSizeXS};
            `}
          >
            <EuiIcon type={collapsed?.[node.id] ? 'arrowRight' : 'arrowDown'} />
          </button>
        )}
        <EuiLink color="text" href={router.link('/{key}', { path: { key: node.id } })}>
          {node.id}
        </EuiLink>
        {node.type === 'root' && (
          <EuiBadge color="hollow">
            <EuiIcon type="branch" size="s" />
          </EuiBadge>
        )}
        {node.type === 'classic' && (
          <EuiBadge color="hollow">
            <EuiIcon type="bullseye" size="s" />
          </EuiBadge>
        )}
        <EuiFlexGroup
          className={`links ${css`
            opacity: 0;
          `}`}
          alignItems="center"
          gutterSize="s"
        >
          <EuiToolTip
            content={i18n.translate('xpack.streams.streamsTable.openInNewTab', {
              defaultMessage: 'Open in new tab',
            })}
          >
            <EuiButtonIcon
              aria-label={i18n.translate('xpack.streams.streamsTable.openInNewTab', {
                defaultMessage: 'Open in new tab',
              })}
              iconType="popout"
              target="_blank"
              href={router.link('/{key}', { path: { key: node.id } })}
            />
          </EuiToolTip>
          <EuiToolTip
            content={i18n.translate('xpack.streams.streamsTable.openInDiscover', {
              defaultMessage: 'Open in Discover',
            })}
          >
            <EuiButtonIcon
              iconType="discoverApp"
              href={discoverUrl}
              aria-label={i18n.translate('xpack.streams.streamsTable.openInDiscover', {
                defaultMessage: 'Open in Discover',
              })}
            />
          </EuiToolTip>
          <EuiToolTip
            content={i18n.translate('xpack.streams.streamsTable.management', {
              defaultMessage: 'Management',
            })}
          >
            <EuiButtonIcon
              iconType="gear"
              aria-label={i18n.translate('xpack.streams.streamsTable.management', {
                defaultMessage: 'Management',
              })}
              href={router.link('/{key}/management', { path: { key: node.id } })}
            />
          </EuiToolTip>
        </EuiFlexGroup>
      </EuiFlexGroup>
      {node.children.length > 0 && !collapsed?.[node.id] && (
        <EuiFlexItem>
          <EuiFlexGroup direction="column" gutterSize="xs">
            {node.children.map((child, index) => (
              <NestedView key={child.id} last={index === node.children.length - 1}>
                <StreamNode node={child} collapsed={collapsed} setCollapsed={setCollapsed} />
              </NestedView>
            ))}
          </EuiFlexGroup>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
}
