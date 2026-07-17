#!/usr/bin/env bash
# provision_windows_vms.sh — create the 3 persistent Windows Defend VMs for the
# BlackHat 2026 demo (multi-VM: WKSTN-RECV01, SRV-DC01, WIN-FIN-03), matching
# the RSA 2026 demo's GCP provisioning pattern (see
# x-pack/.../scripts/endpoint/rsa_2026_demo/provisioner.ts vmType=gcp path and
# x-pack/.../scripts/endpoint/common/vm_services.ts createGcpHostVmClient).
#
# Existing persistent Defend VMs in this project (patrykkopycinski-forensics-defend-*,
# patrykkopycinski-respact-defend-*) are Ubuntu — fine for the eval harness'
# Linux-flavored slice-1/2 evals, but the BlackHat demo narrative is Windows
# (SRV-DC01 domain controller, `vssadmin`, `.locked` ransomware). These three
# new VMs are Windows Server 2022 to match.
#
# Usage:
#   GCP_PROJECT=elastic-security-dev GCP_ZONE=us-central1-a ./provision_windows_vms.sh
#
# Requires: gcloud (authenticated), an Elastic Agent enrollment token for the
# deployed BlackHat demo project (pass via FLEET_URL + ENROLLMENT_TOKEN, or
# leave unset to provision without enrollment and run enroll_windows_vms.ps1
# manually once the deploy URL is known).
set -euo pipefail

GCP_PROJECT="${GCP_PROJECT:-elastic-security-dev}"
GCP_ZONE="${GCP_ZONE:-us-central1-a}"
MACHINE_TYPE="${MACHINE_TYPE:-e2-standard-4}"
IMAGE_FAMILY="${IMAGE_FAMILY:-windows-2022}"
IMAGE_PROJECT="${IMAGE_PROJECT:-windows-cloud}"
NAME_PREFIX="${NAME_PREFIX:-blackhat-demo}"

# GCP instance names (GCP names must be lowercase/hyphenated) paired with the
# demo-narrative Windows hostname each VM must answer to. Plain arrays kept in
# lockstep by index — bash 3.2 (macOS default) has no associative arrays.
#
# IMPORTANT: `${NAME_PREFIX}-wkstn-recv01` and `${NAME_PREFIX}-win-fin-03` both
# truncate to the identical 15-char NetBIOS name (`BLACKHAT-DEMO-W`) if left at
# their GCP instance name — Fleet's `local_metadata.host.hostname` and the
# skill's `.fleet-agents` host lookup would then be unable to distinguish the
# two hosts. Renaming to the short narrative hostname below (all ≤15 chars,
# all unique) is REQUIRED, not cosmetic.
HOSTS=(
  "${NAME_PREFIX}-wkstn-recv01"
  "${NAME_PREFIX}-srv-dc01"
  "${NAME_PREFIX}-win-fin-03"
)
NARRATIVE_HOSTNAMES=(
  "WKSTN-RECV01"
  "SRV-DC01"
  "WIN-FIN-03"
)

LABELS="division=engineering,org=security,team=securityengineeringproductivity,project=blackhat-demo"

for i in "${!HOSTS[@]}"; do
  vm_name="${HOSTS[$i]}"

  if gcloud compute instances describe "$vm_name" --project "$GCP_PROJECT" --zone "$GCP_ZONE" &>/dev/null; then
    echo "[provision] $vm_name already exists, skipping create."
    continue
  fi

  echo "[provision] creating $vm_name ($IMAGE_FAMILY, $MACHINE_TYPE)..."
  gcloud compute instances create "$vm_name" \
    --project "$GCP_PROJECT" \
    --zone "$GCP_ZONE" \
    --machine-type "$MACHINE_TYPE" \
    --image-family "$IMAGE_FAMILY" \
    --image-project "$IMAGE_PROJECT" \
    --boot-disk-size 100GB \
    --boot-disk-type pd-ssd \
    --labels "$LABELS" \
    --metadata sysprep-specialize-script-cmd="googet -noconfirm=true install google-compute-engine-ssh",enable-windows-ssh=TRUE

  echo "[provision] $vm_name created. Waiting for guest agent (WinRM/RDP) to come up..."
done

echo ""
echo "[provision] Verifying/applying narrative hostnames (rename + reboot if needed)..."
NEEDS_REBOOT=()
for i in "${!HOSTS[@]}"; do
  vm_name="${HOSTS[$i]}"
  narrative_name="${NARRATIVE_HOSTNAMES[$i]}"
  current_name=$(gcloud compute ssh "$(whoami)@$vm_name" --project "$GCP_PROJECT" --zone "$GCP_ZONE" \
    --command "powershell -Command \"\$env:COMPUTERNAME\"" --tunnel-through-iap 2>/dev/null | tail -1 | tr -d '\r')

  if [[ "$current_name" == "$narrative_name" ]]; then
    echo "[provision] $vm_name already answers to $narrative_name."
    continue
  fi

  echo "[provision] renaming $vm_name ($current_name -> $narrative_name)..."
  gcloud compute ssh "$(whoami)@$vm_name" --project "$GCP_PROJECT" --zone "$GCP_ZONE" \
    --command "powershell -Command \"Rename-Computer -NewName '$narrative_name' -Force\"" --tunnel-through-iap
  NEEDS_REBOOT+=("$vm_name")
done

if [[ ${#NEEDS_REBOOT[@]} -gt 0 ]]; then
  echo "[provision] rebooting to apply hostname rename: ${NEEDS_REBOOT[*]}"
  gcloud compute instances reset "${NEEDS_REBOOT[@]}" --project "$GCP_PROJECT" --zone "$GCP_ZONE"
fi

echo ""
echo "[provision] Done. Next steps (per VM, run in order):"
echo "  1. ./install_qualys_windows_vm.sh   (remote-invoke via gcloud compute scp/ssh --tunnel-through-iap)"
echo "  2. Enroll into Fleet (Elastic Defend + Osquery integration) — use the deployed project's enrollment token"
echo "  3. ./create_mutex_task.ps1          (schedules the Global\\UpdaterMutex creation on boot)"
echo ""
echo "VM names created/verified: ${HOSTS[*]}"
echo "Narrative hostnames: ${NARRATIVE_HOSTNAMES[*]}"
