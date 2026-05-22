/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import type { Observable } from 'rxjs';
import useObservable from 'react-use/lib/useObservable';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiComboBox,
  type EuiComboBoxOptionOption,
  EuiDescribedFormGroup,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DetectorSettings } from './duplicate_detections_settings';
import type { MyTeamsResult } from './duplicate_detections_owners';

export interface DuplicateDetectionsSettingsPanelProps {
  settings$: Observable<DetectorSettings>;
  /**
   * Plugin names known to the detector (extracted from current events) –
   * pre-fills the "Scope to plugins" combo box so users can pick without
   * having to remember exact spelling.
   */
  knownSources: string[];
  /**
   * GitHub team handles ("@elastic/...") that own at least one plugin per the
   * server-supplied ownership map. Pre-fills the "Scope to my teams" combo
   * box so users don't have to remember exact handles. Empty when the
   * owners route is unavailable (e.g. non-dev environment).
   */
  knownTeams: string[];
  onUpdate: (patch: Partial<DetectorSettings>) => void;
  onReset: () => void;
  /**
   * Called when the user clicks the "Detect my teams" button. Expected to ask
   * the server to derive the developer's likely teams from `git config
   * user.email` + commit history and resolve with structured suggestions. The
   * panel handles the loading + display state internally so callers only need
   * to wire the actual fetch.
   */
  onDetectMyTeams?: () => Promise<MyTeamsResult>;
}

const EMPTY_SETTINGS: DetectorSettings = {
  enabled: true,
  ignoredPathPrefixes: [],
  scopedSources: [],
  scopedTeams: [],
};

export const DuplicateDetectionsSettingsPanel: React.FC<DuplicateDetectionsSettingsPanelProps> = ({
  settings$,
  knownSources,
  knownTeams,
  onUpdate,
  onReset,
  onDetectMyTeams,
}) => {
  const settings = useObservable<DetectorSettings>(settings$, EMPTY_SETTINGS);
  const [newPrefix, setNewPrefix] = useState('');
  const [detectionState, setDetectionState] = useState<{
    status: 'idle' | 'loading' | 'done';
    result?: MyTeamsResult;
  }>({ status: 'idle' });

  const sourceOptions = useMemo<Array<EuiComboBoxOptionOption<string>>>(
    () =>
      [...new Set([...knownSources, ...settings.scopedSources])]
        .sort()
        .map((s) => ({ label: s, value: s })),
    [knownSources, settings.scopedSources]
  );

  const selectedSourceOptions = useMemo<Array<EuiComboBoxOptionOption<string>>>(
    () => settings.scopedSources.map((s) => ({ label: s, value: s })),
    [settings.scopedSources]
  );

  const handleSourcesChange = useCallback(
    (selected: Array<EuiComboBoxOptionOption<string>>) => {
      onUpdate({
        scopedSources: selected
          .map((o) => o.value ?? o.label)
          .filter((v): v is string => Boolean(v)),
      });
    },
    [onUpdate]
  );

  const handleSourceCreate = useCallback(
    (raw: string) => {
      const value = raw.trim();
      if (!value) return;
      if (settings.scopedSources.includes(value)) return;
      onUpdate({ scopedSources: [...settings.scopedSources, value] });
    },
    [onUpdate, settings.scopedSources]
  );

  const teamOptions = useMemo<Array<EuiComboBoxOptionOption<string>>>(
    () =>
      [...new Set([...knownTeams, ...settings.scopedTeams])]
        .sort()
        .map((t) => ({ label: t, value: t })),
    [knownTeams, settings.scopedTeams]
  );

  const selectedTeamOptions = useMemo<Array<EuiComboBoxOptionOption<string>>>(
    () => settings.scopedTeams.map((t) => ({ label: t, value: t })),
    [settings.scopedTeams]
  );

  const handleTeamsChange = useCallback(
    (selected: Array<EuiComboBoxOptionOption<string>>) => {
      onUpdate({
        scopedTeams: selected.map((o) => o.value ?? o.label).filter((v): v is string => Boolean(v)),
      });
    },
    [onUpdate]
  );

  const handleTeamCreate = useCallback(
    (raw: string) => {
      const value = raw.trim();
      if (!value) return;
      if (settings.scopedTeams.includes(value)) return;
      onUpdate({ scopedTeams: [...settings.scopedTeams, value] });
    },
    [onUpdate, settings.scopedTeams]
  );

  const handleDetectMyTeams = useCallback(async () => {
    if (!onDetectMyTeams) return;
    setDetectionState({ status: 'loading' });
    const result = await onDetectMyTeams();
    setDetectionState({ status: 'done', result });
  }, [onDetectMyTeams]);

  const handleAddSuggestedTeam = useCallback(
    (team: string) => {
      if (settings.scopedTeams.includes(team)) return;
      onUpdate({ scopedTeams: [...settings.scopedTeams, team] });
    },
    [onUpdate, settings.scopedTeams]
  );

  const handleApplyAllSuggestions = useCallback(() => {
    const result = detectionState.result;
    if (!result || result.suggestedTeams.length === 0) return;
    const merged = [
      ...new Set([...settings.scopedTeams, ...result.suggestedTeams.map((s) => s.team)]),
    ];
    onUpdate({ scopedTeams: merged });
  }, [detectionState.result, onUpdate, settings.scopedTeams]);

  const addPrefix = useCallback(() => {
    const value = newPrefix.trim();
    if (!value) return;
    if (settings.ignoredPathPrefixes.includes(value)) {
      setNewPrefix('');
      return;
    }
    onUpdate({ ignoredPathPrefixes: [...settings.ignoredPathPrefixes, value] });
    setNewPrefix('');
  }, [newPrefix, onUpdate, settings.ignoredPathPrefixes]);

  const removePrefix = useCallback(
    (prefix: string) => {
      onUpdate({
        ignoredPathPrefixes: settings.ignoredPathPrefixes.filter((p) => p !== prefix),
      });
    },
    [onUpdate, settings.ignoredPathPrefixes]
  );

  return (
    <EuiForm component="form" data-test-subj="duplicateDetectionsSettingsPanel">
      <EuiDescribedFormGroup
        ratio="third"
        title={
          <h3>
            {i18n.translate(
              'xpack.observabilityShared.duplicateRequestDetector.settings.enabledTitle',
              { defaultMessage: 'Detection enabled' }
            )}
          </h3>
        }
        description={i18n.translate(
          'xpack.observabilityShared.duplicateRequestDetector.settings.enabledDescription',
          {
            defaultMessage:
              'Main switch. When off, the HTTP interceptor stays attached but no detections are recorded and no toasts are shown.',
          }
        )}
      >
        <EuiFormRow display="rowCompressed">
          <EuiSwitch
            checked={settings.enabled}
            label={
              settings.enabled
                ? i18n.translate(
                    'xpack.observabilityShared.duplicateRequestDetector.settings.enabledOn',
                    { defaultMessage: 'On – recording detections' }
                  )
                : i18n.translate(
                    'xpack.observabilityShared.duplicateRequestDetector.settings.enabledOff',
                    { defaultMessage: 'Off – detector is paused' }
                  )
            }
            onChange={(e) => onUpdate({ enabled: e.target.checked })}
            data-test-subj="duplicateDetectionsSettingsEnabledSwitch"
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>

      <EuiDescribedFormGroup
        ratio="third"
        title={
          <h3>
            {i18n.translate(
              'xpack.observabilityShared.duplicateRequestDetector.settings.scopeTitle',
              { defaultMessage: 'Scope to plugins' }
            )}
          </h3>
        }
        description={i18n.translate(
          'xpack.observabilityShared.duplicateRequestDetector.settings.scopeDescription',
          {
            defaultMessage:
              'Only record detections whose source plugin matches one of these entries. Leave empty to record everything.',
          }
        )}
      >
        <EuiFormRow display="rowCompressed">
          <EuiComboBox<string>
            isClearable
            placeholder={i18n.translate(
              'xpack.observabilityShared.duplicateRequestDetector.settings.scopePlaceholder',
              { defaultMessage: 'All plugins (no scoping)' }
            )}
            options={sourceOptions}
            selectedOptions={selectedSourceOptions}
            onChange={handleSourcesChange}
            onCreateOption={handleSourceCreate}
            data-test-subj="duplicateDetectionsSettingsScopeCombo"
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>

      <EuiDescribedFormGroup
        ratio="third"
        title={
          <h3>
            {i18n.translate(
              'xpack.observabilityShared.duplicateRequestDetector.settings.scopeTeamsTitle',
              { defaultMessage: 'Scope to my teams' }
            )}
          </h3>
        }
        description={i18n.translate(
          'xpack.observabilityShared.duplicateRequestDetector.settings.scopeTeamsDescription',
          {
            defaultMessage:
              'Only record detections whose source plugin is owned by one of these GitHub teams (per the repo CODEOWNERS / kibana.jsonc files). Plugins with no known owner are filtered out when this is set.',
          }
        )}
      >
        <EuiFormRow display="rowCompressed">
          <>
            <EuiComboBox<string>
              isClearable
              isDisabled={knownTeams.length === 0 && settings.scopedTeams.length === 0}
              placeholder={
                knownTeams.length === 0
                  ? i18n.translate(
                      'xpack.observabilityShared.duplicateRequestDetector.settings.scopeTeamsUnavailable',
                      {
                        defaultMessage:
                          'Owner map unavailable (only works in dev mode of the observability solution)',
                      }
                    )
                  : i18n.translate(
                      'xpack.observabilityShared.duplicateRequestDetector.settings.scopeTeamsPlaceholder',
                      { defaultMessage: 'All teams (no scoping)' }
                    )
              }
              options={teamOptions}
              selectedOptions={selectedTeamOptions}
              onChange={handleTeamsChange}
              onCreateOption={handleTeamCreate}
              data-test-subj="duplicateDetectionsSettingsScopeTeamsCombo"
            />
            {onDetectMyTeams && (
              <>
                <EuiSpacer size="s" />
                <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
                  <EuiFlexItem grow={false}>
                    <EuiToolTip
                      content={i18n.translate(
                        'xpack.observabilityShared.duplicateRequestDetector.settings.detectMyTeamsTooltip',
                        {
                          defaultMessage:
                            'Asks the dev server to derive your likely teams from `git config user.email` and your recent commits in this checkout.',
                        }
                      )}
                    >
                      <EuiButton
                        size="s"
                        iconType="user"
                        isLoading={detectionState.status === 'loading'}
                        onClick={handleDetectMyTeams}
                        data-test-subj="duplicateDetectionsSettingsDetectMyTeamsBtn"
                      >
                        {i18n.translate(
                          'xpack.observabilityShared.duplicateRequestDetector.settings.detectMyTeamsBtn',
                          { defaultMessage: 'Detect my teams' }
                        )}
                      </EuiButton>
                    </EuiToolTip>
                  </EuiFlexItem>
                  {detectionState.status === 'done' && detectionState.result?.detectedEmail && (
                    <EuiFlexItem grow={false}>
                      <EuiText size="xs" color="subdued">
                        {i18n.translate(
                          'xpack.observabilityShared.duplicateRequestDetector.settings.detectedAs',
                          {
                            defaultMessage:
                              'Detected as {email} ({matched}/{scanned} commits matched a known plugin)',
                            values: {
                              email: detectionState.result.detectedEmail,
                              matched: detectionState.result.matchedFileCount,
                              scanned: detectionState.result.scannedFileCount,
                            },
                          }
                        )}
                      </EuiText>
                    </EuiFlexItem>
                  )}
                </EuiFlexGroup>

                {detectionState.status === 'done' &&
                  detectionState.result &&
                  detectionState.result.suggestedTeams.length === 0 && (
                    <>
                      <EuiSpacer size="s" />
                      <EuiText
                        size="xs"
                        color="subdued"
                        data-test-subj="duplicateDetectionsSettingsNoSuggestions"
                      >
                        {detectionState.result.detectedEmail
                          ? i18n.translate(
                              'xpack.observabilityShared.duplicateRequestDetector.settings.noSuggestions',
                              {
                                defaultMessage:
                                  'No teams inferred from your recent commits. Try picking one manually above.',
                              }
                            )
                          : i18n.translate(
                              'xpack.observabilityShared.duplicateRequestDetector.settings.noGitEmail',
                              {
                                defaultMessage:
                                  '`git config user.email` is unset — set it to enable detection.',
                              }
                            )}
                      </EuiText>
                    </>
                  )}

                {detectionState.status === 'done' &&
                  detectionState.result &&
                  detectionState.result.suggestedTeams.length > 0 && (
                    <>
                      <EuiSpacer size="s" />
                      <EuiText size="xs" color="subdued">
                        {i18n.translate(
                          'xpack.observabilityShared.duplicateRequestDetector.settings.suggestionsLabel',
                          { defaultMessage: 'Click a suggestion to add it to the filter:' }
                        )}
                      </EuiText>
                      <EuiSpacer size="xs" />
                      <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
                        {detectionState.result.suggestedTeams.map((suggestion) => {
                          const alreadySelected = settings.scopedTeams.includes(suggestion.team);
                          return (
                            <EuiFlexItem grow={false} key={suggestion.team}>
                              <EuiBadge
                                color={alreadySelected ? 'success' : 'hollow'}
                                iconType={alreadySelected ? 'check' : 'plus'}
                                iconSide="left"
                                onClick={() => handleAddSuggestedTeam(suggestion.team)}
                                onClickAriaLabel={i18n.translate(
                                  'xpack.observabilityShared.duplicateRequestDetector.settings.addSuggestionAriaLabel',
                                  {
                                    defaultMessage: 'Add {team} to scoped teams',
                                    values: { team: suggestion.team },
                                  }
                                )}
                                isDisabled={alreadySelected}
                                data-test-subj={`duplicateDetectionsSettingsSuggestion-${suggestion.team}`}
                              >
                                {suggestion.team}{' '}
                                <EuiText
                                  component="span"
                                  size="xs"
                                  color="subdued"
                                  css={{ marginLeft: 4 }}
                                >
                                  ({suggestion.evidenceCount})
                                </EuiText>
                              </EuiBadge>
                            </EuiFlexItem>
                          );
                        })}
                        <EuiFlexItem grow={false}>
                          <EuiButtonEmpty
                            size="xs"
                            iconType="check"
                            onClick={handleApplyAllSuggestions}
                            data-test-subj="duplicateDetectionsSettingsApplyAllSuggestions"
                          >
                            {i18n.translate(
                              'xpack.observabilityShared.duplicateRequestDetector.settings.applyAllSuggestions',
                              { defaultMessage: 'Apply all' }
                            )}
                          </EuiButtonEmpty>
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    </>
                  )}
              </>
            )}
          </>
        </EuiFormRow>
      </EuiDescribedFormGroup>

      <EuiDescribedFormGroup
        ratio="third"
        title={
          <h3>
            {i18n.translate(
              'xpack.observabilityShared.duplicateRequestDetector.settings.excludeTitle',
              { defaultMessage: 'Excluded path prefixes' }
            )}
          </h3>
        }
        description={i18n.translate(
          'xpack.observabilityShared.duplicateRequestDetector.settings.excludeDescription',
          {
            defaultMessage:
              'Requests whose path starts with one of these prefixes are skipped. Useful for muting noisy endpoints that are not actionable.',
          }
        )}
      >
        <EuiFormRow display="rowCompressed">
          <>
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem>
                <EuiFieldText
                  compressed
                  fullWidth
                  value={newPrefix}
                  onChange={(e) => setNewPrefix(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addPrefix();
                    }
                  }}
                  placeholder="/api/saved_objects"
                  data-test-subj="duplicateDetectionsSettingsAddPrefixInput"
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  size="s"
                  iconType="plus"
                  isDisabled={!newPrefix.trim()}
                  onClick={addPrefix}
                  data-test-subj="duplicateDetectionsSettingsAddPrefixBtn"
                >
                  {i18n.translate(
                    'xpack.observabilityShared.duplicateRequestDetector.settings.addPrefixBtn',
                    { defaultMessage: 'Add' }
                  )}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="s" />
            {settings.ignoredPathPrefixes.length === 0 ? (
              <EuiText size="xs" color="subdued">
                {i18n.translate(
                  'xpack.observabilityShared.duplicateRequestDetector.settings.noExtraExclusions',
                  { defaultMessage: 'No user-defined exclusions.' }
                )}
              </EuiText>
            ) : (
              <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
                {settings.ignoredPathPrefixes.map((prefix) => (
                  <EuiFlexItem grow={false} key={prefix}>
                    <EuiBadge
                      color="hollow"
                      iconType="cross"
                      iconSide="right"
                      iconOnClick={() => removePrefix(prefix)}
                      iconOnClickAriaLabel={i18n.translate(
                        'xpack.observabilityShared.duplicateRequestDetector.settings.removePrefixAriaLabel',
                        {
                          defaultMessage: 'Remove {prefix} from exclusions',
                          values: { prefix },
                        }
                      )}
                      data-test-subj={`duplicateDetectionsSettingsPrefixBadge-${prefix}`}
                    >
                      {prefix}
                    </EuiBadge>
                  </EuiFlexItem>
                ))}
              </EuiFlexGroup>
            )}
          </>
        </EuiFormRow>
      </EuiDescribedFormGroup>

      <EuiSpacer size="m" />

      {!settings.enabled && (
        <EuiCallOut
          announceOnMount
          size="s"
          color="warning"
          iconType="pause"
          title={i18n.translate(
            'xpack.observabilityShared.duplicateRequestDetector.settings.disabledCallout',
            {
              defaultMessage:
                'Detection is paused. Existing entries are kept; no new bursts will be recorded until you turn it back on.',
            }
          )}
        />
      )}

      <EuiSpacer size="m" />

      <EuiFlexGroup justifyContent="flexEnd" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            iconType="refresh"
            onClick={onReset}
            data-test-subj="duplicateDetectionsSettingsResetBtn"
          >
            {i18n.translate(
              'xpack.observabilityShared.duplicateRequestDetector.settings.resetBtn',
              { defaultMessage: 'Reset to defaults' }
            )}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiForm>
  );
};
