/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { useEuiTheme, useGeneratedHtmlId } from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import {
  EuiPageTemplate,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFieldSearch,
  EuiFilterGroup,
  EuiFilterButton,
  EuiFlexGrid,
  EuiCard,
  EuiButton,
  EuiPopover,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiConfirmModal,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { ConnectorFlyout } from '../components/connector_flyout';
import { useConnectors } from '../hooks/use_connectors';
import { WORKPLACE_CONNECTOR_TYPES } from '../../common';
import { BraveLogo } from '../components/brave_logo';

// TODO: PoC code, make it production-ready.
export const ConnectorsLandingPage = () => {
  const { services } = useKibana();
  const httpClient = services.http;

  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);
  const [selectedConnectorType, setSelectedConnectorType] = useState<string | null>(null);

  const { euiTheme } = useEuiTheme();
  const { isLoading, createConnector, deleteConnector, isConnected, connectors } =
    useConnectors(httpClient);
  const brave = useMemo(
    () => connectors.find((c) => c.type === WORKPLACE_CONNECTOR_TYPES.BRAVE_SEARCH),
    [connectors]
  );
  const braveId = brave?.id;
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleSelectConnector = (connectorType: string) => {
    setSelectedConnectorType(connectorType);
    setIsFlyoutOpen(true);
  };

  const handleSaveConnector = async (data: {
    apiKey: string;
    name?: string;
    features?: string[];
  }) => {
    if (!selectedConnectorType) return;

    await createConnector({
      name: 'Brave Search',
      type: selectedConnectorType,
      secrets: {
        api_key: data.apiKey,
      },
      config: {},
      features: data.features && data.features.length ? data.features : ['search_web'],
    });
  };

  const handleCloseFlyout = () => {
    setIsFlyoutOpen(false);
    setSelectedConnectorType(null);
  };

  const braveConnected = isConnected(WORKPLACE_CONNECTOR_TYPES.BRAVE_SEARCH);
  const closeMenu = () => setIsMenuOpen(false);
  const onConfigure = () => {
    setSelectedConnectorType(WORKPLACE_CONNECTOR_TYPES.BRAVE_SEARCH);
    setIsFlyoutOpen(true);
    closeMenu();
  };
  const onDelete = () => {
    setShowDeleteModal(true);
    closeMenu();
  };
  const modalTitleId = useGeneratedHtmlId();

  return (
    <EuiPageTemplate>
      <EuiPageTemplate.Header
        pageTitle="Configure connectors"
        description="Add connectors to enhance your agent's context."
      />
      <EuiPageTemplate.Section>
        <EuiFlexGroup gutterSize="m" alignItems="center">
          <EuiFlexItem>
            <EuiFieldSearch fullWidth placeholder="Search" aria-label="Search connectors" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFilterGroup>
              <EuiFilterButton hasActiveFilters={false} numFilters={1} iconType="arrowDown">
                Categories
              </EuiFilterButton>
            </EuiFilterGroup>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="xl" />

        <EuiFlexGrid columns={4} gutterSize="m">
          <EuiFlexItem>
            <div style={{ position: 'relative' }}>
              <EuiCard
                icon={<BraveLogo size={48} />}
                title="Brave Search"
                description="Connect to Brave Search API for web search capabilities."
                footer={
                  <EuiFlexGroup justifyContent="center" gutterSize="xs" responsive={false}>
                    {braveConnected ? (
                      <EuiFlexItem grow={false}>
                        <EuiPopover
                          button={
                            <EuiButton
                              size="s"
                              iconType="arrowDown"
                              iconSide="right"
                              onClick={() => setIsMenuOpen((v) => !v)}
                              color="success"
                              fill
                              style={{
                                backgroundColor: '#008A5E',
                                borderColor: '#008A5E',
                                color: '#FFFFFF',
                                opacity: 1,
                              }}
                            >
                              Connected
                            </EuiButton>
                          }
                          isOpen={isMenuOpen}
                          closePopover={closeMenu}
                          panelPaddingSize="none"
                          anchorPosition="downLeft"
                        >
                          <EuiContextMenuPanel
                            items={[
                              <EuiContextMenuItem key="configure" icon="gear" onClick={onConfigure}>
                                Configure
                              </EuiContextMenuItem>,
                              <EuiContextMenuItem
                                key="delete"
                                icon="trash"
                                css={css`
                                  color: ${euiTheme.colors.textDanger};
                                `}
                                onClick={onDelete}
                              >
                                <span className="euiTextColor-danger">Delete</span>
                              </EuiContextMenuItem>,
                            ]}
                          />
                        </EuiPopover>
                      </EuiFlexItem>
                    ) : (
                      <EuiFlexItem grow={false}>
                        <EuiButton
                          size="s"
                          onClick={() =>
                            handleSelectConnector(WORKPLACE_CONNECTOR_TYPES.BRAVE_SEARCH)
                          }
                          isLoading={isLoading}
                          color="primary"
                          fill
                        >
                          Connect
                        </EuiButton>
                      </EuiFlexItem>
                    )}
                  </EuiFlexGroup>
                }
              />
            </div>
          </EuiFlexItem>
        </EuiFlexGrid>
      </EuiPageTemplate.Section>

      {isFlyoutOpen && selectedConnectorType && (
        <ConnectorFlyout
          connectorType={selectedConnectorType}
          connectorName="Brave Search"
          onClose={handleCloseFlyout}
          onSave={handleSaveConnector}
          isEditing={Boolean(braveConnected)}
        />
      )}

      {showDeleteModal && (
        <EuiConfirmModal
          title="Delete connector?"
          aria-labelledby={modalTitleId}
          titleProps={{ id: modalTitleId }}
          onCancel={() => setShowDeleteModal(false)}
          onConfirm={async () => {
            if (braveId) {
              await deleteConnector(braveId);
            }
            setShowDeleteModal(false);
          }}
          cancelButtonText="Cancel"
          confirmButtonText="Delete"
          buttonColor="danger"
        />
      )}
    </EuiPageTemplate>
  );
};
