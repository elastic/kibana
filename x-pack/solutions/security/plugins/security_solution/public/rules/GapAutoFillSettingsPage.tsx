/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useState } from 'react';
import {
  EuiSwitch,
  EuiFieldText,
  EuiFormRow,
  EuiSpacer,
  EuiCallOut,
  EuiPanel,
  EuiTitle,
  EuiText,
} from '@elastic/eui';
import { KibanaServices } from '../common/lib/kibana';

interface GapAutoFillJob {
  id: string;
  enabled: boolean;
  name?: string;
  status?: string;
  lastRun?: string;
  state?: {
    name?: string;
    amountOfGapsToProcessPerRun?: number;
    amountOfRetries?: number;
    status?: string;
  };
}

export const GapAutoFillSettingsPage: React.FC = () => {
  const [job, setJob] = useState<GapAutoFillJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const JOB_ID = 'default';

  // Fetch job on mount
  useEffect(() => {
    fetchJob();
  }, []);

  const fetchJob = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await KibanaServices.get().http.get<GapAutoFillJob>(
        `/api/alerting/gaps/auto_fill/jobs/${JOB_ID}`
      );
      setJob(data);
      setEnabled(data.enabled);
      setName(data.state?.name || data.name || 'Gap Auto-Fill Job');
    } catch (err: any) {
      if (err?.response?.status === 404) {
        // Job doesn't exist yet
        setJob(null);
        setEnabled(false);
        setName('Gap Auto-Fill Job');
      } else {
        setError('Failed to load job status');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle switch toggle - creates job if it doesn't exist, or enables/disables if it does
  const handleSwitchToggle = async () => {
    setSaving(true);
    setError(null);

    try {
      if (!job) {
        // Job doesn't exist - create it
        await KibanaServices.get().http.post('/api/alerting/gaps/auto_fill/jobs', {
          body: JSON.stringify({}),
        });
        // Fetch the newly created job
        await fetchJob();
      } else {
        // Job exists - toggle enable/disable
        await KibanaServices.get().http.put(`/api/alerting/gaps/auto_fill/jobs/${JOB_ID}`, {
          body: JSON.stringify({ enabled: !enabled }),
        });
        setEnabled(!enabled);
      }
    } catch (err) {
      setError('Failed to update job status');
    } finally {
      setSaving(false);
    }
  };

  // Update job parameters
  const handleNameChange = async (newName: string) => {
    setName(newName);
    if (job) {
      setSaving(true);
      setError(null);
      try {
        await KibanaServices.get().http.put(`/api/alerting/gaps/auto_fill/jobs/${JOB_ID}`, {
          body: JSON.stringify({ name: newName }),
        });
      } catch (err) {
        setError('Failed to update job name');
      } finally {
        setSaving(false);
      }
    }
  };

  if (loading) {
    return <div>{'Loading...'}</div>;
  }

  return (
    <EuiPanel>
      <EuiTitle size="m">
        <h2>{'Gap Auto-Fill Job Settings'}</h2>
      </EuiTitle>

      <EuiSpacer size="m" />

      {error && (
        <>
          <EuiCallOut color="danger" title={error} />
          <EuiSpacer size="m" />
        </>
      )}

      <EuiFormRow label="Enable Auto-Fill Job">
        <EuiSwitch
          label={job ? (enabled ? 'Enabled' : 'Disabled') : 'Create and Enable Job'}
          checked={enabled}
          onChange={handleSwitchToggle}
          disabled={saving}
          showLabel={true}
        />
      </EuiFormRow>

      {job && (
        <>
          <EuiSpacer size="m" />
          <EuiFormRow label="Job Name">
            <EuiFieldText
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              disabled={saving}
            />
          </EuiFormRow>

          <EuiSpacer size="m" />

          <EuiText size="s" color="subdued">
            <p>
              <strong>{'Status:'}</strong> {job.state?.status || job.status || 'Unknown'}
            </p>
            {job.lastRun && (
              <p>
                <strong>{'Last Run:'}</strong> {new Date(job.lastRun).toLocaleString()}
              </p>
            )}
            {job.state && (
              <>
                <p>
                  <strong>{'Gaps per run:'}</strong>{' '}
                  {job.state.amountOfGapsToProcessPerRun || 'N/A'}
                </p>
                <p>
                  <strong>{'Retries:'}</strong> {job.state.amountOfRetries || 'N/A'}
                </p>
              </>
            )}
          </EuiText>
        </>
      )}
    </EuiPanel>
  );
}; 