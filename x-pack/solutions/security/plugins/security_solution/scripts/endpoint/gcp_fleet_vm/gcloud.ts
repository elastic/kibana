/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import execa from 'execa';
import type { ToolingLog } from '@kbn/tooling-log';

const redact = (s: string) =>
    s
        // coarse base64-ish redaction
        .replace(/([A-Za-z0-9+/]{16,}={0,2})/g, '<redacted>')
        // tailscale auth keys (defense-in-depth)
        .replace(/tskey-[A-Za-z0-9_-]+/g, '<redacted>');

export const assertGcloudAvailable = async (log: ToolingLog): Promise<void> => {
    try {
        const { stdout } = await execa('gcloud', ['--version']);
        log.verbose(`gcloud detected:\n${stdout}`);
    } catch (e) {
        throw new Error(
            `gcloud is required but was not found. Install it and run 'gcloud auth login' + 'gcloud auth application-default login'.\n${e}`
        );
    }
};

export const gcloud = async (
    log: ToolingLog,
    args: string[],
    opts: Partial<execa.Options> = {}
): Promise<{ stdout: string; stderr: string }> => {
    // Important: log at info before executing any gcloud command so operators see progress.
    // Keep it redacted and single-line to avoid noisy logs.
    const rendered = `gcloud ${args.map((a) => redact(a)).join(' ')}`;
    log.info(`[gcp] ${rendered}`);
    log.debug(`Running gcloud: ${rendered}`);
    const { stdout, stderr } = await execa('gcloud', args, { ...opts });
    return { stdout, stderr };
};

export const gcloudSsh = async ({
    log,
    project,
    zone,
    instance,
    command,
}: {
    log: ToolingLog;
    project: string;
    zone: string;
    instance: string;
    command: string;
}): Promise<string> => {
    const { stdout } = await gcloud(log, [
        'compute',
        'ssh',
        instance,
        '--project',
        project,
        '--zone',
        zone,
        '--quiet',
        '--command',
        command,
    ]);
    return stdout.trim();
};

export const gcloudDeleteInstance = async ({
    log,
    project,
    zone,
    instance,
}: {
    log: ToolingLog;
    project: string;
    zone: string;
    instance: string;
}): Promise<void> => {
    await gcloud(log, [
        'compute',
        'instances',
        'delete',
        instance,
        '--project',
        project,
        '--zone',
        zone,
        '--quiet',
    ]);
};

export const gcloudInstanceExists = async ({
    log,
    project,
    zone,
    instance,
}: {
    log: ToolingLog;
    project: string;
    zone: string;
    instance: string;
}): Promise<boolean> => {
    try {
        await gcloud(log, [
            'compute',
            'instances',
            'describe',
            instance,
            '--project',
            project,
            '--zone',
            zone,
            '--quiet',
        ]);
        return true;
    } catch (e) {
        return false;
    }
};


