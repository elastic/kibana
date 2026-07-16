# create_mutex_task.ps1 - schedules a boot-time task that holds a named mutex
# (Global\UpdaterMutex) for the life of the machine, so the Osquery
# `winbaseobj` live query (object_type='Mutant') has a real target on the
# BlackHat demo VMs - matching the mutex row in extract_iocs'
# osquery_mutex_guidance output.
#
# Deterministic + reboot-safe: a scheduled task beats a one-shot
# `CreateMutex()` call because a mutex handle only survives as long as the
# process holding it. This wraps a tiny persistent PowerShell process (via a
# hidden Start-Sleep loop holding the mutex handle) in a SYSTEM-run scheduled
# task that starts at boot and restarts on failure.
#
# Run ON the target Windows VM (SRV-DC01 / WKSTN-RECV01 - wherever the demo
# narrative needs the mutex to resolve) as Administrator:
#
#   .\create_mutex_task.ps1
#
# Verify after running (or after reboot):
#   Get-ScheduledTask -TaskName "BlackHatDemoMutexHolder" | Get-ScheduledTaskInfo
#
# The osquery winbaseobj query that should then return this mutex
# (see extract_iocs' osquery_mutex_guidance in
# endpoint_forensic_analysis_skill.ts):
#
#   SELECT session_id, pid, object_name, object_type
#   FROM winbaseobj
#   WHERE object_type = 'Mutant' AND object_name LIKE '%UpdaterMutex%';

param(
    [string]$MutexName = "Global\UpdaterMutex",
    [string]$TaskName = "BlackHatDemoMutexHolder"
)

$holderScript = @"
`$mutex = New-Object System.Threading.Mutex(`$false, '$MutexName')
`$mutex.WaitOne() | Out-Null
while (`$true) { Start-Sleep -Seconds 3600 }
"@

$holderPath = "C:\ProgramData\blackhat-demo-mutex-holder.ps1"
Set-Content -Path $holderPath -Value $holderScript -Encoding UTF8

$action = New-ScheduledTaskAction -Execute "powershell.exe" `
    -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$holderPath`""
$trigger = New-ScheduledTaskTrigger -AtStartup
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) `
    -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries

Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger `
    -Principal $principal -Settings $settings -Description `
    "BlackHat 2026 demo: holds $MutexName so the endpoint_forensic.extract_iocs -> osquery winbaseobj mutex row resolves." | Out-Null

Start-ScheduledTask -TaskName $TaskName

Write-Host "Scheduled task '$TaskName' created and started - holding mutex '$MutexName'."
Write-Host "Verify: Get-ScheduledTask -TaskName '$TaskName' | Get-ScheduledTaskInfo"
