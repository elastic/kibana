---
title: "Invisible miners: unveiling GHOSTENGINE’s crypto mining operations"
slug: "invisible-miners-unveiling-ghostengine"
date: "2024-05-22"
description: "Elastic Security Labs has identified REF4578, an intrusion set incorporating several malicious modules and leveraging vulnerable drivers to disable known security solutions (EDRs) for crypto mining."
author:
  - slug: salim-bitam
  - slug: samir-bousseaden
  - slug: terrance-dejesus
  - slug: andrew-pease
image: "ghostengine.jpg"
category:
  - slug: attack-pattern
tags:
  - ref4578
  - ghostengine
  - xmrig
  - crypto
  - hiddenshovel
---

## Preamble

Elastic Security Labs has identified an intrusion set incorporating several malicious modules and leveraging vulnerable drivers to disable known security solutions (EDRs) for crypto mining. Additionally, the team discovered capabilities to establish persistence, install a previously undocumented backdoor, and execute a crypto-miner. We refer to this intrusion set as REF4578 and the primary payload as GHOSTENGINE (tangental research by the team at Antiy has named parts of this intrusion set [HIDDENSHOVEL](https://www.antiy.com/response/HideShoveling.html)).

## Key takeaways

* Malware authors incorporated many contingency and duplication mechanisms
* GHOSTENGINE leverages vulnerable drivers to terminate and delete known EDR agents that would likely interfere with the deployed and well-known coin miner
* This campaign involved an uncommon amount of complexity to ensure both the installation and persistence of the XMRIG miner

## Code analysis 

![REF4578 execution flow](/assets/images/invisible-miners-unveiling-ghostengine/image4.png "REF4578 execution flow")

On May 6, 2024, at 14:08:33 UTC,  the execution of a PE file named `Tiworker.exe` (masquerading as the legitimate Windows `TiWorker.exe` file) signified the beginning of the REF4578 intrusion. The following alerts were captured in telemetry, indicating a known vulnerable driver was deployed.

![REF4578 executes Tiworker to start the infection chain](/assets/images/invisible-miners-unveiling-ghostengine/image8.png "REF4578 executes Tiworker to start the infection chain")

Upon execution, this file downloads and executes a PowerShell script that orchestrates the entire execution flow of the intrusion. Analysis revealed that this binary executes a hardcoded PowerShell command line to retrieve an obfuscated script, `get.png,` which is used to download further tools, modules, and configurations from the attacker C2– as depicted in the screenshot below.

![Downloading get.png](/assets/images/invisible-miners-unveiling-ghostengine/image10.png "Downloading get.png")

### GHOSTENGINE

GHOSTENGINE is responsible for retrieving and executing modules on the machine. It primarily uses HTTP to download files from a configured domain, with a backup IP in case domains are unavailable. Additionally, it employs FTP as a secondary protocol with embedded credentials. The following is a summary of the execution flow:

![The get.png PowerShell script](/assets/images/invisible-miners-unveiling-ghostengine/image11.png "The get.png PowerShell script")

This script downloads and executes `clearn.png`, a component designed to purge the system of remnants from prior infections belonging to the same family but different campaign; it removes malicious files under `C:\Program Files\Common Files\System\ado` and `C:\PROGRA~1\COMMON~1\System\ado\` and removes the following scheduled tasks by name:

* `Microsoft Assist Job`
* `System Help Center Job`
* `SystemFlushDns`
* `SystemFlashDnsSrv`

Evidence of those scheduled task artifacts may be indicators of a prior infection.

![clearn.png removing any infections from previous campaigns](/assets/images/invisible-miners-unveiling-ghostengine/image12.png "clearn.png removing any infections from previous campaigns")

During execution, it attempts to disable Windows Defender and clean the following Windows event log channels: 

* `Application`
* `Security`
* `Setup`
* `System`
* `Forwarded Events`
* `Microsoft-Windows-Diagnostics-Performance`
* `Microsoft-Windows-AppModel-Runtime/Operational`
* `Microsoft-Windows-Winlogon/Operational`

![get.png clearing Windows log channels](/assets/images/invisible-miners-unveiling-ghostengine/image13.png "get.png clearing Windows log channels")

`get.png` disables Windows Defender, enables remote services, and clears the contents of:

* `C:\Windows\Temp\`
* `C:\Windows\Logs\`
* `C:\$Recycle.Bin\`
* `C:\windows\ZAM.krnl.trace`

![get.png disabling Windows Defender and enabling remote services](/assets/images/invisible-miners-unveiling-ghostengine/image6.png "get.png disabling Windows Defender and enabling remote services")

`get.png` also verifies that the `C:\` volume has at least 10 MB of free space to download files, storing them in `C:\Windows\Fonts`. If not, it will try to delete large files from the system before looking for another suitable volume with sufficient space and creating a folder under `$RECYCLE.BIN\Fonts`.

To get the current DNS resolution for the C2 domain names, GHOSTENGINE uses a hardcoded list of DNS servers, `1.1.1.1` and `8.8.8.8`.

Next, to establish persistence, `get.png` creates the following scheduled tasks as `SYSTEM`:

* **OneDriveCloudSync** using `msdtc `to run  the malicious service DLL `C:\Windows\System32\oci.dll` every 20 minutes (described later)
* **DefaultBrowserUpdate** to run `C:\Users\Public\run.bat,` which downloads the `get.png` script and executes it every 60 minutes
* **OneDriveCloudBackup** to execute `C:\Windows\Fonts\smartsscreen.exe` every 40 minutes
    
![Scheduled tasks for persistence](/assets/images/invisible-miners-unveiling-ghostengine/image21.png "Scheduled tasks for persistence")

`get.png` terminates all `curl.exe` processes and any PowerShell process with `*get.png*` in its command line, excluding the current process. This is a way to terminate any concurrently running instance of the malware.

This script then downloads  `config.txt`, a JSON file containing the hashes of the PE files it retrieved. This file verifies whether any updated binaries are to be downloaded by checking the hashes of the previously downloaded files from any past infections.

![config.txt file used to check for updated binaries](/assets/images/invisible-miners-unveiling-ghostengine/image9.png "config.txt file used to check for updated binaries")

Finally,` get.png` downloads all of its modules and various PE files. Below is a table containing a description of each downloaded file:

| path                                           | Type              | Description                                                                                                                                |
|------------------------------------------------|-------------------|--------------------------------------------------------------------------------------------------------------------------------------------|
| `C:\Windows\System32\drivers\aswArPots.sys`      | Kernel driver     | Vulnerable driver from Avast                                                                                                               |
| `C:\Windows\System32\drivers\IObitUnlockers.sys` | Kernel driver     | Vulnerable driver from IObit                                                                                                               |
| `C:\Windows\Fonts\curl.exe`                      | PE executable     | Used to download files via cURL                                                                                                            |
| `C:\Windows\Fonts\smartsscreen.exe`              | PE executable     | Core payload (GHOSTENGINE), its main purpose is to deactivate security instrumentation, complete initial infection, and execute the miner. |
| `C:\Windows\System32\oci.dll`                    | Service DLL       | Persistence/updates module                                                                                                                 |
| `backup.png`                                     | Powershell script | Backdoor module                                                                                                                            |
| `kill.png`                                       | Powershell script | A PowerShell script that injects and executes a PE file responsible for killing security sensors                                           |

### GHOSTENGINE modules

GHOSTENGINE deploys several modules that can tamper with security tools, create a backdoor, and check for software updates.

#### EDR agent controller and miner module: smartsscreen.exe

This module primarily terminates any active EDR agent processes before downloading and installing a crypto-miner.

![smartscreen.exe GHOSTENGINE module](/assets/images/invisible-miners-unveiling-ghostengine/image20.png "smartscreen.exe GHOSTENGINE module")

The malware scans and compares all the running processes with a hardcoded list of known EDR agents. If there are any matches, it first terminates the security agent by leveraging the Avast Anti-Rootkit Driver file `aswArPots.sys` with the IOCTL `0x7299C004` to terminate the process by PID.

`smartscreen.exe` is then used to delete the security agent binary with another vulnerable driver, `iobitunlockers.sys` from IObit, with the IOCTL `0x222124`.

`smartscreen.exe` then downloads the XMRig client mining program (`WinRing0x64.png`) from the C2 server as `taskhostw.png`. Finally, it executes XMRig, its drivers, and the configuration file `config.json`, starting the mining process.

![smartscreen.exe executing XMRig](/assets/images/invisible-miners-unveiling-ghostengine/image19.png "smartscreen.exe executing XMRig")

#### Update/Persistence module: oci.dll

The PowerShell script creates a service DLL (`oci.dll`), a phantom DLL loaded by `msdtc`. The DLL's architecture varies depending on the machine; it can be 32-bit or 64-bit. Its primary function is to create system persistence and download any updates from the C2 servers by downloading the `get.png` script from the C2 and executing it.

![oci.dll persistence/update mechanism](/assets/images/invisible-miners-unveiling-ghostengine/image3.png "oci.dll persistence/update mechanism")

Every time the <code>msdtc<strong> </strong></code>service starts, it will load <code>oci.dll</code> to spawn the PowerShell one-liner that executes <code>get.png</code> : 

![oci.dll downloading and executing get.png](/assets/images/invisible-miners-unveiling-ghostengine/image23.png "oci.dll downloading and executing get.png")

#### EDR agent termination module: `kill.png`

`kill.png` is a PowerShell script that injects shellcode into the current process, decrypting and loading a PE file into memory.

![kill.png injecting shellcode](/assets/images/invisible-miners-unveiling-ghostengine/image24.png "kill.png injecting shellcode")

This module is written in C++, and the authors have integrated redundancy into its operation. This redundancy is evident in the replication of the technique used in `smartsscreen.exe` to terminate and delete EDR agent binaries; it continuously scans for any new processes.

![kill.png hardcoded security agent monitoring list](/assets/images/invisible-miners-unveiling-ghostengine/image7.png "kill.png hardcoded security agent monitoring list")

#### Powershell backdoor module: `backup.png`

The PowerShell script functions like a backdoor, enabling remote command execution on the system. It continually sends a Base64-encoded JSON object containing a unique ID, derived from the current time and the computer name while awaiting base64-encoded commands. The results of those commands are then sent back.

![backup.png operating as a backdoor](/assets/images/invisible-miners-unveiling-ghostengine/image18.png "backup.png operating as a backdoor")

In this example `eyJpZCI6IjE3MTU2ODYyNDA3MjYyNiIsImhvc3QiOiJhbmFseXNpcyJ9` is the Base64-encoded JSON object:

![C2 Communication example of backup.png](/assets/images/invisible-miners-unveiling-ghostengine/image16.png "backup.png HTTP header information")

```
$ echo "eyJpZCI6IjE3MTU2ODYyNDA3MjYyNiIsImhvc3QiOiJhbmFseXNpcyJ9" | base64 -D
{"id":"171568624072626","host":"analysis"}
```

## Miner configuration

XMRig is a legitimate crypto miner, and they have documented the configuration file usage and elements [here](https://xmrig.com/docs/miner/config). As noted at the beginning of this publication, the ultimate goal of the REF4578 intrusion set was to gain access to an environment and deploy a persistent Monero crypto miner, XMRig.

We extracted the configuration file from the miner, which was tremendously valuable as it allowed us to report on the Monero Payment ID and track the worker and pool statistics, mined cryptocurrency, transaction IDs, and withdrawals.

Below is an excerpt from the REF4578 XMRig configuration file:

```
{
    "autosave": false,
    "background": true,
    "colors": true,

...truncated...

    "donate-level": 0,
    "donate-over-proxy": 0,
    "pools": [
        {
            "algo": "rx/0",
            "coin": "monero",
            "url": "pool.supportxmr[.]com:443",
            "user": "468ED2Qcchk4shLbD8bhbC3qz2GFXqjAUWPY3VGbmSM2jfJw8JpSDDXP5xpkMAHG98FHLmgvSM6ZfUqa9gvArUWP59tEd3f",
            "keepalive": true,
            "tls": true

...truncated...

    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36",
    "verbose": 0,
    "watch": true,
    "pause-on-battery": false,
    "pause-on-active": false
}
```

### Monero Payment ID

Monero is a blockchain cryptocurrency focusing on obfuscation and fungibility to ensure anonymity and privacy. The [Payment ID](https://www.getmonero.org/resources/moneropedia/paymentid.html) is an arbitrary and optional transaction attachment that consists of 32 bytes (64 hexadecimal characters) or 8 bytes (in the case of integrated addresses).

Using the Payment ID from the above configuration excerpt (`468ED2Qcchk4shLbD8bhbC3qz2GFXqjAUWPY3VGbmSM2jfJw8JpSDDXP5xpkMAHG98FHLmgvSM6ZfUqa9gvArUWP59tEd3f`) we can view the worker and pool statistics on one of the [Monero Mining Pool site](https://monero.hashvault.pro/en/)s listed in the configuration. 

![Worker and pool statistics of the REF4578 Payment ID](/assets/images/invisible-miners-unveiling-ghostengine/image22.png "Worker and pool statistics of the REF4578 Payment ID")

Additionally, we can see the transaction hashes, which we can look up on the Monero blockchain explorer. Note that while transactions date back four months ago, this only indicates the _potential_ monetary gain by this specific worker and account.

![Payments for the REF4578 Payment ID](/assets/images/invisible-miners-unveiling-ghostengine/image2.png "Payments for the REF4578 Payment ID")

Using the Blockchain Explorer and one of the [transaction hashes](https://monero.hashvault.pro/explorer/prove/7c106041de7cc4c86cb9412a43cb7fc0a6ad2c76cfdb0e03a8ef98dd9e744442/468ED2Qcchk4shLbD8bhbC3qz2GFXqjAUWPY3VGbmSM2jfJw8JpSDDXP5xpkMAHG98FHLmgvSM6ZfUqa9gvArUWP59tEd3f/f1415e7710323cf769ce74d57ec9b7337d7a61b9ee4bba2ee38f9e8c3c067a005a484f8b9a14fb8964f56bb76181eafdb7dbb00677a155b067204423f23ab50ad146867795f560ad9443520f073f0bd71b8afd3259b24ae2a59aa7772f68fc028388f001bfeaa0f4ccc1f547b54924bb116352e9302424d731dc580dcccbb40749503640895d31559d7fc258b616576e7f052bbdbbc7083126f595c36015de02f6e95da8cfc81ee5fa1bd4d4c29bf55db96e4779924ab0d26993f7bf834ceb01fe314fd19e55c7304f91e809be3e29b68778f0da6dbcfe57d3eafc6dae5e090645d6b3753f44c4e1c1356b19d406c6efe7a55ec7c2b4997bd1fc65f15a4fda03619fc53beff111ddd9fd94f5ba3c503ccb73f52009bd3c1d47216b9a7c82d5065ac5e8a946e998cbc23fd8815a93cbbd655961709ac3ea8b1fd87e940e72370dc542ca4c22837e91ab5dd94d2c1c0a81e8ec9558766575ba236c3ae29b0f470fe881e22a03da405118a3353a5ecc618d1837e1a2bd449888a47a761efa98c407ce857fd389cdea63e9670edcf4b4d6c4c33e9c2851430270c8ef6dfb8cfeb9025ca7a17c9acdbfeb6670b3eabcbfde36cbc907e23fdd0c64aa2fc4103412a70c97838e177184c2f3d794e089b47ce66656d6c4cab2bbb4d6d71a3245f1dc360c7da9220eec90ef6e67cb13831b52ef14cf5bf1dd6adc202edc0892d9529145047786ed1042857f6986ed608839d595f06c1971f415f967d260d17ea8f5582400) we got from the Payment ID, we can see the public key, the amount is withdrawn, and when. Note that these public keys are used with one-time addresses, or stealth addresses that the adversary would then use a private key with to unlock the funds.

![Transactions for the REF4578 Payment ID](/assets/images/invisible-miners-unveiling-ghostengine/image17.png "Transactions for the REF4578 Payment ID")

In the above example for transaction `7c106041de7cc4c86cb9412a43cb7fc0a6ad2c76cfdb0e03a8ef98dd9e744442` we can see that there was a withdrawal of `0.109900000000` XMR (the abbreviation for Monero) totaling $14.86 USD. The Monerao Mining Pool site shows four transactions of approximately the same amount of XMR, totaling approximately $60.70 USD (January - March 2024).

As of the publication of this research, there are still active miners connected to the REF4578 Payment ID.

![Miners actively connecting to the REF4578 Payment ID](/assets/images/invisible-miners-unveiling-ghostengine/image5.png "Miners actively connecting to the REF4578 Payment ID")

While this specific Payment ID does not appear to be a big earner, it is evident that REF4578 could operate this intrusion set successfully. Other victims of this campaign could have different Payment IDs used to track intrusions, which could be combined for a larger overall haul.

## Malware and MITRE ATT&CK

Elastic uses the [MITRE ATT&CK](https://attack.mitre.org/) framework to document common tactics, techniques, and procedures that threats use against enterprise networks.

### Tactics

Tactics represent the why of a technique or sub-technique. It is the adversary’s tactical goal: the reason for performing an action.

* [Execution](https://attack.mitre.org/tactics/TA0002/)
* [Persistence](https://attack.mitre.org/tactics/TA0003)
* [Defense Evasion](https://attack.mitre.org/tactics/TA0005/)
* [Discovery](https://attack.mitre.org/tactics/TA0007)
* [Command and Control](https://attack.mitre.org/tactics/TA0011)
* [Exfiltration](https://attack.mitre.org/tactics/TA0010/)
* [Impact](https://attack.mitre.org/tactics/TA0040/)

### Techniques

Techniques represent how an adversary achieves a tactical goal by performing an action.

* [Command and Scripting Interpreter: PowerShell](https://attack.mitre.org/techniques/T1059/001/)
* [Command and Scripting Interpreter: Windows Command Shell](https://attack.mitre.org/techniques/T1059/003/)
* [Scheduled Task/Job: Scheduled Task](https://attack.mitre.org/techniques/T1053/005/)
* [Indicator Removal: Clear Windows Event Logs](https://attack.mitre.org/techniques/T1070/001/)
* [Masquerading](https://attack.mitre.org/techniques/T1036/)
* [Process Injection](https://attack.mitre.org/techniques/T1055/)
* [Process Discovery](https://attack.mitre.org/techniques/T1057/)
* [Exfiltration Over C2 Channel](https://attack.mitre.org/techniques/T1041/)
* [Data Encoding](https://attack.mitre.org/techniques/T1132)
* [Resource Hijacking](https://attack.mitre.org/techniques/T1496/)
* [Service Stop](https://attack.mitre.org/techniques/T1489/)

## Mitigating GHOSTENGINE

### Detection

The first objective of the GHOSTENGINE malware is to incapacitate endpoint security solutions and disable specific Windows event logs, such as Security and System logs,  which record process creation and service registration. Therefore, it is crucial to prioritize the detection and prevention of these initial actions:

* Suspicious PowerShell execution
* Execution from unusual directories
* Elevating privileges to system integrity
* Deploying vulnerable drivers and establishing associated kernel mode services.

Once the vulnerable drivers are loaded, detection opportunities decrease significantly, and organizations must find compromised endpoints that stop transmitting logs to their SIEM.

Network traffic may generate and be identifiable if DNS record lookups point to [known mining pool](https://miningpoolstats.stream/monero) domains over well-known ports such as HTTP (`80`) and HTTPS  (`443`). Stratum is also another popular network protocol for miners, by default, over port `4444`.

The analysis of this intrusion set revealed the following detection rules and behavior prevention events:

* [Suspicious PowerShell Downloads](https://github.com/elastic/protections-artifacts/blob/ecde1dfa1aaeb6ace99e758c2ba7d2e499f93515/behavior/rules/execution_suspicious_powershell_downloads.toml)
* [Service Control Spawned via Script Interpreter](https://github.com/elastic/detection-rules/blob/79f575b33c747e0c3c5f7293c95f3ddab611e683/rules/windows/privilege_escalation_service_control_spawned_script_int.toml)
* [Local Scheduled Task Creation](https://github.com/elastic/detection-rules/blob/79f575b33c747e0c3c5f7293c95f3ddab611e683/rules/windows/persistence_local_scheduled_task_creation.toml)
* [Process Execution from an Unusual Directory](https://github.com/elastic/detection-rules/blob/79f575b33c747e0c3c5f7293c95f3ddab611e683/rules/windows/defense_evasion_from_unusual_directory.toml)
* [Svchost spawning Cmd](https://github.com/elastic/detection-rules/blob/79f575b33c747e0c3c5f7293c95f3ddab611e683/rules/windows/execution_command_shell_started_by_svchost.toml#L41)
* [Unusual Parent-Child Relationship](https://github.com/elastic/detection-rules/blob/79f575b33c747e0c3c5f7293c95f3ddab611e683/rules/windows/execution_command_shell_started_by_svchost.toml#L41)
* [Clearing Windows Event Logs](https://github.com/elastic/detection-rules/blob/79f575b33c747e0c3c5f7293c95f3ddab611e683/rules/windows/defense_evasion_clearing_windows_event_logs.toml)
* [Microsoft Windows Defender Tampering](https://github.com/elastic/detection-rules/blob/79f575b33c747e0c3c5f7293c95f3ddab611e683/rules/windows/defense_evasion_microsoft_defender_tampering.toml)
* [Potential Privilege Escalation via Missing DLL](https://github.com/elastic/protections-artifacts/blob/ecde1dfa1aaeb6ace99e758c2ba7d2e499f93515/behavior/rules/privilege_escalation_potential_privilege_escalation_via_missing_dll.toml)
* [Binary Masquerading via Untrusted Path](https://github.com/elastic/protections-artifacts/blob/ecde1dfa1aaeb6ace99e758c2ba7d2e499f93515/behavior/rules/defense_evasion_binary_masquerading_via_untrusted_path.toml#L58)

### Prevention

Malicious Files Prevention : 

![GHOSTENGINE file prevention](/assets/images/invisible-miners-unveiling-ghostengine/image1.png "GHOSTENGINE file prevention")

Shellcode Injection Prevention:
    
![GHOSTENGINE shellcode prevention](/assets/images/invisible-miners-unveiling-ghostengine/image14.png "GHOSTENGINE shellcode prevention")

Vulnerable Drivers file creation prevention ([Windows.VulnDriver.ArPot](https://github.com/elastic/protections-artifacts/blob/ecde1dfa1aaeb6ace99e758c2ba7d2e499f93515/yara/rules/Windows_VulnDriver_ArPot.yar) and [Windows.VulnDriver.IoBitUnlocker](https://github.com/elastic/protections-artifacts/blob/ecde1dfa1aaeb6ace99e758c2ba7d2e499f93515/yara/rules/Windows_VulnDriver_IoBitUnlocker.yar) )

![GHOSTENGINE driver prevention](/assets/images/invisible-miners-unveiling-ghostengine/image15.png "GHOSTENGINE driver prevention")

#### YARA

Elastic Security has created YARA rules to identify this activity. 

* [Windows Trojan GHOSTENGINE](https://github.com/elastic/protections-artifacts/blob/main/yara/rules/Windows_Trojan_GhostEngine.yar)
* [Windows.VulnDriver.ArPot](https://github.com/elastic/protections-artifacts/blob/ecde1dfa1aaeb6ace99e758c2ba7d2e499f93515/yara/rules/Windows_VulnDriver_ArPot.yar)
* [Windows.VulnDriver.IoBitUnlocker](https://github.com/elastic/protections-artifacts/blob/ecde1dfa1aaeb6ace99e758c2ba7d2e499f93515/yara/rules/Windows_VulnDriver_IoBitUnlocker.yar)

## Observations

All observables are also available for [download](https://github.com/elastic/labs-releases/tree/main/indicators/ghostengine) in both ECS and STIX format.

The following observables were discussed in this research.

| Observable                                                       | Type      | Name                                                        | Reference                          |
|------------------------------------------------------------------|-----------|-------------------------------------------------------------|------------------------------------|
| `2fe78941d74d35f721556697491a438bf3573094d7ac091b42e4f59ecbd25753` | SHA-256   | `C:\Windows\Fonts\smartsscreen.exe`                           | GHOSTENGINE EDR controller module  |
| `4b5229b3250c8c08b98cb710d6c056144271de099a57ae09f5d2097fc41bd4f1` | SHA-256   | `C:\Windows\System32\drivers\aswArPots.sys`                   | Avast vulnerable driver            |
| `2b33df9aff7cb99a782b252e8eb65ca49874a112986a1c49cd9971210597a8ae` | SHA-256   | `C:\Windows\System32\drivers\IObitUnlockers.sys`              | Iobit vulnerable driver            |
| `3ced0552b9ecf3dfecd14cbcc3a0d246b10595d5048d7f0d4690e26ecccc1150` | SHA-256   | `C:\Windows\System32\oci.dll`                            | Update/Persistence module (64-bit)   |
| `3b2724f3350cb5f017db361bd7aae49a8dbc6faa7506de6a4b8992ef3fd9d7ab` | SHA-256   | `C:\Windows\System32\oci.dll`                            | Update/Persistence module (32-bit)   |
| `35eb368c14ad25e3b1c58579ebaeae71bdd8ef7f9ccecfc00474aa066b32a03f` | SHA-256   | `C:\Windows\Fonts\taskhostw.exe`                              | Miner client                       |
| `786591953336594473d171e269c3617d7449876993b508daa9b96eedc12ea1ca` | SHA-256   | `C:\Windows\Fonts\config.json`                                | Miner configuration file           |
| `11bd2c9f9e2397c9a16e0990e4ed2cf0679498fe0fd418a3dfdac60b5c160ee5` | SHA-256   | `C:\Windows\Fonts\WinRing0x64.sys`                            | Miner driver                       |
| `aac7f8e174ba66d62620bd07613bac1947f996bb96b9627b42910a1db3d3e22b` | SHA-256   | `C:\ProgramData\Microsoft\DeviceSync\SystemSync\Tiworker.exe` | Initial stager                     |
| `6f3e913c93887a58e64da5070d96dc34d3265f456034446be89167584a0b347e` | SHA-256   | `backup.png`                                                  | GHOSTENGINE backdoor module        |
| `7c242a08ee2dfd5da8a4c6bc86231985e2c26c7b9931ad0b3ea4723e49ceb1c1` | SHA-256   | `get.png`                                                     | GHOSTENGINE loader                 |
| `cc4384510576131c126db3caca027c5d159d032d33ef90ef30db0daa2a0c4104` | SHA-256   | `kill.png`                                                    | GHOSTENGINE EDR termination module |
| `download.yrnvtklot[.]com`                                         | domain    |                                                             | C2 server                          |
| `111.90.158[.]40`                                                  | ipv4-addr |                                                             | C2 server                          |
| `ftp.yrnvtklot[.]com`                                              | domain    |                                                             | C2 server                          |
| `93.95.225[.]137`                                                  | ipv4-addr |                                                             | C2 server                          |
| `online.yrnvtklot[.]com`                                           | domain    |                                                             | C2 server                          |

## References

The following were referenced throughout the above research:

* https://www.antiy.com/response/HideShoveling.html
