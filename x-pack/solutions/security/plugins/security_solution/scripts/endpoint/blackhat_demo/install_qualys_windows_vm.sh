#!/usr/bin/env bash
# install_qualys_windows_vm.sh — install Qualys Cloud Agent on a GCP Windows VM.
#
# Windows counterpart to ao-workspace/scripts/install-qualys-gcp-vm.sh (Linux
# .deb via SSH). Windows GCP VMs don't expose SSH by default, so this uses
# `gcloud compute scp`/`gcloud compute ssh` over the Windows OpenSSH agent
# (enabled by default on the GCE Windows images used here — see
# provision_windows_vms.sh, windows-2022 family ships OpenSSH Server).
#
# Downloads the .msi on the operator machine (credentials never touch VM
# metadata), copies it over, installs silently, and activates — mirroring the
# Linux script's flow so both are auditable the same way.
#
# Usage:
#   VM_NAME=blackhat-demo-srv-dc01 GCP_PROJECT=elastic-security-dev GCP_ZONE=us-central1-a \
#     ./install_qualys_windows_vm.sh
#
# Requires: gcloud, QUALYS_DOWNLOAD_BASIC (or ~/.elastic/qualys-download.env)
set -euo pipefail

VM_NAME="${VM_NAME:?set VM_NAME}"
GCP_PROJECT="${GCP_PROJECT:?set GCP_PROJECT}"
GCP_ZONE="${GCP_ZONE:?set GCP_ZONE}"
SSH_USER="${SSH_USER:-$(whoami)}"

SECRETS_FILE="${QUALYS_SECRETS_FILE:-$HOME/.elastic/qualys-download.env}"
if [[ -f "$SECRETS_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$SECRETS_FILE"
  set +a
fi

CUSTOMER_ID="${QUALYS_CUSTOMER_ID:-1eba65d2-5e87-68e2-8043-9f4e7e9e93d4}"
ACTIVATION_ID="${QUALYS_ACTIVATION_ID:-4fdd79be-729b-49ae-9d7b-853d0b9c95d1}"
: "${QUALYS_DOWNLOAD_BASIC:?Set QUALYS_DOWNLOAD_BASIC or create $SECRETS_FILE}"

WORKDIR="$(mktemp -d /tmp/qualys-gcp-win.XXXX)"
trap 'rm -rf "$WORKDIR"' EXIT

echo "[qualys-gcp-win] downloading Windows agent locally..."
curl -fsSL --location --request POST \
  'https://qualysapi.qg2.apps.qualys.com/qps/rest/1.0/download/ca/downloadbinary/' \
  --header 'Content-Type: text/xml' \
  --header 'X-Requested-With: QualysPostman' \
  --header 'Accept: application/json' \
  --header "Authorization: Basic ${QUALYS_DOWNLOAD_BASIC}" \
  --data-raw '<?xml version="1.0" encoding="UTF-8"?>
<ServiceRequest>
    <data>
        <DownloadBinary>
            <platform>WINDOWS</platform>
            <architecture>X_86_64</architecture>
        </DownloadBinary>
    </data>
</ServiceRequest>' \
  -o "${WORKDIR}/QualysCloudAgent.exe"

# The downloadbinary API returns a self-extracting .exe installer for
# Windows (PE/MZ binary), not an .msi — msiexec rejects it with error 1620.
# Run it directly with the documented silent install args instead.
WEB_SERVICE_URI="${QUALYS_WEB_SERVICE_URI:-https://qagpublic.qg2.apps.qualys.com/CloudAgent/}"
REMOTE_EXE='C:\Windows\Temp\QualysCloudAgent.exe'
echo "[qualys-gcp-win] copying package to ${VM_NAME}..."
gcloud compute scp "${WORKDIR}/QualysCloudAgent.exe" \
  "${SSH_USER}@${VM_NAME}:${REMOTE_EXE}" \
  --project "$GCP_PROJECT" --zone "$GCP_ZONE" --tunnel-through-iap

echo "[qualys-gcp-win] installing + activating on ${VM_NAME}..."
gcloud compute ssh "${SSH_USER}@${VM_NAME}" \
  --project "$GCP_PROJECT" --zone "$GCP_ZONE" --tunnel-through-iap \
  --command "powershell.exe -NoProfile -Command \"
if (Get-Service -Name QualysAgent -ErrorAction SilentlyContinue) {
  Write-Host '[qualys] already installed'; exit 0
}
\$p = Start-Process ${REMOTE_EXE} -ArgumentList 'CustomerId={${CUSTOMER_ID}} ActivationId={${ACTIVATION_ID}} WebServiceUri=${WEB_SERVICE_URI}' -Wait -PassThru
Write-Host \\\"[qualys] installer exit code: \$(\$p.ExitCode)\\\"
Start-Sleep -Seconds 5
Get-Service -Name QualysAgent | Select-Object Status
Remove-Item ${REMOTE_EXE} -Force -ErrorAction SilentlyContinue
\""

echo "[qualys-gcp-win] done on ${VM_NAME}"
