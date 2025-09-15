---
title: "The Shelby Strategy"
slug: "the-shelby-strategy"
date: "2025-03-26"
description: "An analysis of REF8685's abuse of GitHub for C2 to evade defenses."
author:
  - slug: salim-bitam
  - slug: seth-goodwin
image: "shelby.png"
category:
  - slug: malware-analysis
tags: 
  - ref8685
  - shelbyc2
  - shelbyloader
---

## Key takeaways

* The SHELBY malware family abuses GitHub for command-and-control, stealing data and retrieving commands
* The attacker’s C2 design has a critical flaw: anyone with the PAT token can control infected machines, exposing a significant security vulnerability
* Unused code and dynamic payload loading suggest the malware is under active development, indicating future updates may address any issues with contemporary versions

## Summary

As part of our ongoing research into emerging threats, we analyzed a potential phishing email sent from an email address belonging to an Iraqi telecommunications company and sent to other employees of that same company.

The phishing email relies on the victim opening the attached `Details.zip` file and executing the contained binary, `JPerf-3.0.0.exe`. This binary utilizes the script-driven installation system, [Inno setup](https://jrsoftware.org/isinfo.php), that contains the malicious application:

* `%AppData%\Local\Microsoft\HTTPApi`: 
    * `HTTPApi.dll` (SHELBYC2)
    * `HTTPService.dll` (SHELBYLOADER)
    * `Microsoft.Http.Api.exe`
    * `Microsoft.Http.Api.exe.config`

The installed `Microsoft.Http.Api.exe` is a benign .NET executable. Its primary purpose is to side-load the malicious `HTTPService.dll`. Once loaded, `HTTPService.dll` acts as the loader, initiating communication with GitHub for its command-and-control (C2).

The loader retrieves a specific value from the C2, which is used to decrypt the backdoor payload, `HTTPApi.dll`. After decryption, the backdoor is loaded into memory as a managed assembly using reflection, allowing it to execute without writing to disk and evading traditional detection mechanisms.

![SHELBYLOADER & SHELBYC2 Execution Chain](/assets/images/the-shelby-strategy/image27.png "SHELBYLOADER & SHELBYC2 Execution Chain")

As of the time of writing, both the backdoor and the loader have a low detection rate on VirusTotal.

![VirusTotal hits for SHELBYC2](/assets/images/the-shelby-strategy/image2.png "VirusTotal hits for SHELBYC2")

![VirusTotal hits for SHELBYLOADER](/assets/images/the-shelby-strategy/image24.png "VirusTotal hits for SHELBYLOADER")

## SHELBYLOADER code analysis

### Obfuscation

Both the loader and backdoor are obfuscated with the open-source tool [Obfuscar](https://github.com/obfuscar/obfuscar), which employs string encryption as one of its features. To bypass this obfuscation, we can leverage [de4dot](https://github.com/de4dot/de4dot) with custom parameters. Obfuscar replaces strings with calls to a string decryptor function, but by providing the token of this function to de4dot, we can effectively deobfuscate the code. Using the parameters `--strtyp` ( the type of string decrypter, in our case `delegate`)  and `--strtok` ( the token of the string decryption method), we can replace these function calls with their corresponding plaintext values, revealing the original strings in the code.

![Deobfuscation using de4dot](/assets/images/the-shelby-strategy/image6.png "Deobfuscation using de4dot")

### Sandbox detection

SHELBYLOADER utilizes sandbox detection techniques to identify virtualized or monitored environments. Once executed, it sends the results back to C2. These results are packaged as log files, detailing whether each detection method successfully identified a sandbox environment, for example:

![Sandbox detection example](/assets/images/the-shelby-strategy/image17.png "Sandbox detection example")

#### Technique 1: WMI Query for System Information

The malware executes a WMI query (`Select * from Win32_ComputerSystem`) to retrieve system details. It then checks the Manufacturer and Model fields for indicators of a virtual machine, such as "VMware" or "VirtualBox."

![Sandbox detection based on system information](/assets/images/the-shelby-strategy/image8.png "Sandbox detection based on system information")

#### Technique 2: Process Enumeration

The malware scans the running processes for known virtualization-related services, including:

* `vmsrvc`
* `vmtools`
* `xenservice`
* `vboxservice`
* `vboxtray`

The presence of these processes tells the malware that it may be running in a virtualized environment.

#### Technique 3: File System Checks

The malware searches for the existence of specific driver files commonly associated with virtualization software, such as:

* `C:\Windows\System32\drivers\VBoxMouse.sys`
* `C:\Windows\System32\drivers\VBoxGuest.sys`
* `C:\Windows\System32\drivers\vmhgfs.sys`
* `C:\Windows\System32\drivers\vmci.sys`

#### Technique 4: Disk Size Analysis

The malware checks the size of the `C:` volume. If the size is less than 50 GB, it may infer that the environment is part of a sandbox, as many virtual machines are configured with smaller disk sizes for testing purposes.

![Sandbox detection based on disk size](/assets/images/the-shelby-strategy/image23.png "Sandbox detection based on disk size")

#### Technique 5: Parent Process Verification

The malware examines its parent process. If the parent process is not `explorer.exe`, it may indicate execution within an automated analysis environment rather than a typical user-driven scenario.

![Sandbox detection based on process tree](/assets/images/the-shelby-strategy/image15.png "Sandbox detection based on process tree")

#### Technique 6: Sleep Time Deviation Detection

The malware employs timing checks to detect if its sleep or delay functions are being accelerated, a common technique used by sandboxes to speed up analysis. Significant deviations in expected sleep times can reveal a sandboxed environment.

![Sandbox detection based on sleep time deviation](/assets/images/the-shelby-strategy/image5.png "Sandbox detection based on sleep time deviation")

#### Technique 7: WMI Query for Video Controller

The malware runs a WMI query (SELECT * FROM Win32_VideoController) to retrieve information about the system's video controller. It then compares the name of the video controller against known values associated with virtual machines: `virtual` or `vmware` or `vbox`.

![Sandbox detection based on the name of the video controller](/assets/images/the-shelby-strategy/image21.png "Sandbox detection based on the name of the video controller")

### Core Functionality

The malware's loader code begins by initializing several variables within its main class constructor. These variables include:

* A GitHub account name
* A private repository name
* A Personal Access Token (PAT) for authenticating and accessing the repository

Additionally, the malware sets up two timers, which are used to trigger specific actions at predefined intervals.

![SHELBYLOADER configuration](/assets/images/the-shelby-strategy/image31.png "SHELBYLOADER configuration")

One of the timers is configured to trigger a specific method 125 seconds after execution. When invoked, this method establishes persistence on the infected system by adding a new entry to the Windows Registry key `SOFTWARE\Microsoft\Windows\CurrentVersion\Run`. Once the method is triggered and the persistence mechanism is successfully executed, the timer is stopped from further triggering.

![Setup persistence](/assets/images/the-shelby-strategy/image22.png "Setup persistence")

This method uses an integer variable to indicate the outcome of its operation. The following table describes each possible value and its meaning:

| ID | Description                       |
|----|-----------------------------------|
| `1`  | Persistence set successfully      |
| `2`  | Persistence already set           |
| `8`  | Unable to add an entry in the key |
| `9`  | Binary not found on disk          |

This integer value is reported back to C2 during its first registration to the C2, allowing the attackers to monitor the success or failure of the persistence mechanism on the infected system.

The second timer is configured to trigger a method responsible for loading the backdoor, which executes 65 seconds after the malware starts. First, the malware generates an MD5 hash based on a combination of system-specific information. The data used to create the hash is formatted as follows, with each component separated by a slash( `/` ):

* The number of processors available on the system.
* The name of the machine (hostname).
* The domain name associated with the user account.
* The username of the currently logged-in user.
* The total number of logical drives present on the system.

![Generate unique identifier](/assets/images/the-shelby-strategy/image12.png "Generate unique identifier")

A subset of this hash is then extracted and used as a unique identifier for the infected machine. This identifier serves as a way for the attackers to track and manage compromised systems within their infrastructure.

After generating the unique identifier, the malware pushes a new commit to the myToken repository using an HTTPS request. The commit includes a directory named after the unique identifier, which contains a file named `Info.txt`. This file stores the following information about the infected system:

* The domain name associated with the user account.
* The username of the currently logged-in user.
* The log of sandbox detection results detailing which techniques succeeded or failed.
* The persistence flag (as described in the table above) indicates the outcome of the persistence mechanism.
* The current date and time of the beaconing event

![Example content of Info.txt](/assets/images/the-shelby-strategy/image28.png "Example content of Info.txt")

The malware first attempts to push a commit to the repository without using a proxy. If this initial attempt fails, it falls back to using the system-configured proxy for its communication.

After the first beaconing and successful registration of the victim, the malware attempts to access the same GitHub repository directory it created earlier and download a file named `License.txt` (we did not observe any jitter in the checking interval, but the server could handle this). If present, this file contains a 48-byte value, which is used to generate an AES decryption key. This file is uploaded by the attacker’s backend only after validating that the malware is not running in a sandbox environment. This ensures only validated infections receive the key and escalate the execution chain to the backdoor.

![Function calls for registration and retrieval of License content](/assets/images/the-shelby-strategy/image18.png "Function calls for registration and retrieval of License content")

The malware generates an AES key and initialization vector (IV) from the contents of `License.txt`. It first hashes the 48-byte value using SHA256, then uses the resulting hash as the key and the first 16 bytes as the IV.

![Generating decryption AES key and IV](/assets/images/the-shelby-strategy/image25.png "Generating decryption AES key and IV")

It proceeds to decrypt the file `HTTPApi.dll`, which contains the backdoor payload. After decryption, the malware uses the `Assembly.Load` method to reflectively load the backdoor into memory. This technique lets the malware execute the decrypted backdoor directly without writing it to disk.

![Decrypts and loads SHELBYC2](/assets/images/the-shelby-strategy/image4.png "Decrypts and loads SHELBYC2")

### DNS-Based Keying Mechanism

Another variant of SHELBYLOADER uses a different approach for registration and retrieving the byte sequence used to generate the AES key and IV. 

First, the malware executes the same anti-sandboxing methods, creating a string of `1` or `0` depending on whether a sandbox is detected for each technique. 

For its C2 registration, the malware builds a subdomain under `arthurshelby.click` with three parts: the first subdomain is a static string (`s`), the second subdomain is the unique identifier encoded in Base32, and the third subdomain is a concatenated string in the format `DomainName\HostName >> Anti-Sandboxing Results >> Persistence Flag` encoded in base32.

For example, a complete domain might look like `s.grldiyrsmvsggojzmi4wmyi.inevyrcfknfvit2qfvcvinjriffe6ib6hyqdambqgaydambahy7cama.arthurshelby.click`

![CyberChef recipe for decoding generated subdomains](/assets/images/the-shelby-strategy/image13.png "CyberChef recipe for decoding generated subdomains")

After that, the malware executes multiple DNS queries to subdomains of `arthurshelby.click`. The IP addresses returned from these queries are concatenated into a byte sequence, which is then used to generate the AES key for decrypting the backdoor, following the same process described earlier.

The subdomains follow this format:

* The first subdomain is `l<index>`, where the index corresponds to the order of the DNS calls (e.g., `l1`, `l2`, etc.), ensuring the byte sequence is assembled correctly.
* The second subdomain is the unique identifier encoded in Base32.

![Subdomains contacted to retrieve the bytes used to generate the AES key](/assets/images/the-shelby-strategy/image16.png "Subdomains contacted to retrieve the bytes used to generate the AES key")

## SHELBYC2 code analysis

The backdoor begins by regenerating the same unique identifier created by the loader. It does this by computing an MD5 hash of the exact system-specific string used earlier. The backdoor then creates a [Mutex](https://learn.microsoft.com/en-us/windows/win32/sync/using-mutex-objects) to ensure that only one instance of the malware runs on the infected machine. The Mutex is named by prepending the string `Global\GHS` to the unique identifier.

![Mutex initialization](/assets/images/the-shelby-strategy/image9.png "Mutex initialization")

After 65 seconds, the backdoor executes a method that collects the following system information:

* current user identity
* operating system version
* the process ID of the malware
* machine name
* current working directory

Interestingly, this collected information is neither used locally nor exfiltrated to the C2 server. This suggests that the code might be dead code left behind during development or that the malware is still under active development, with potential plans to utilize this data in future versions.

![Dead code](/assets/images/the-shelby-strategy/image1.png "Dead code")

The malware then uploads the current timestamp to a file named Vivante.txt in the myGit repository within its unique directory (named using the system's unique identifier). This timestamp serves as the last beaconing time, enabling the attackers to monitor the malware's activity and confirm that the infected system is still active. The word **"Vivante"** translates to **"alive"** in French, which reflects the file's role as a heartbeat indicator for the compromised machine.

Next, the malware attempts to download the file `Command.txt`, which contains a list of commands issued by the operator for execution on the infected system.

If `Command.txt` contains no commands, the malware checks for commands in another file named `Broadcast.txt`. Unlike `Command.txt`, this file is located outside the malware's directory and is used to broadcast commands to all infected systems simultaneously. This approach allows the attacker to simultaneously execute operations across multiple compromised machines, streamlining large-scale control.

### Commands handling table:

Commands in the `Command.txt` file can either be handled commands or system commands executed with Powershell. The following is a description of every handled command.

#### /download

This command downloads a file from a GitHub repository to the infected machine. It requires two parameters:

* The name of the file stored in the GitHub repository.
* The path where the file will be saved on the infected machine.

![Download command](/assets/images/the-shelby-strategy/image20.png)

#### /upload

This command uploads a file from the infected machine to the GitHub repository. It takes one parameter: the path of the file to be uploaded.

![Upload command](/assets/images/the-shelby-strategy/image32.png)

#### /dlextract

This command downloads a zip file from the GitHub repository (similar to `/download`), extracts its contents, and saves them to a specified directory on the machine.

![Zip extraction command](/assets/images/the-shelby-strategy/image30.png)

#### /evoke

This command is used to load a .NET binary reflectively; it takes two parameters: the first parameter is the path of an AES encrypted .NET binary previously downloaded to the infected machine, the second parameter is a value used to derive AES and the IV, similar to how the loader loads the backdoor.

This command reflectively loads a .NET binary similar to how the SHELBYLOADER loads the backdoor. It requires two parameters:

* The path to an AES-encrypted .NET binary previously downloaded to the infected machine.
* A value used to derive the AES key and IV.

![.NET invocation command](/assets/images/the-shelby-strategy/image3.png)

#### System commands

Any command not starting with one of the above is treated as a PowerShell command and executed accordingly.

![Powershell execution command](/assets/images/the-shelby-strategy/image7.png)

### Communication

The malware does not use the [Git tool](https://git-scm.com/) in the backend to send commits. Instead, it crafts HTTP requests to interact with GitHub. It sends a commit to the repository using a JSON object with the following structure:

```json
{
  "message": "Commit message",
  "content": "<base64 encoded content>",
  "sha": "<hash>"
}
```

The malware sets specific HTTP headers for the request, including:

* **Accept:** `application/vnd.github.v3+json`
* **Content-Type:** `application/json`
* **Authorization:** `token <PAT_token>`
* **User-Agent:** `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36`

![Initialization of the HTTP request](/assets/images/the-shelby-strategy/image14.png)

The request is sent to the GitHub API endpoint, constructed as follows:

```
https://api.github.com/repos/<owner>/<repo>/contents/<unique identifier>/<file>
```

The Personal Access Token (PAT) required to access the private repository is embedded within the binary. This allows the malware to authenticate and perform actions on the repository without using the standard Git toolchain.

![Wireshark capture of a C2 communication by SHELBYC2](/assets/images/the-shelby-strategy/image26.png)

The way the malware is set up means that anyone with the [PAT (Personal Access Token)](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens) can theoretically fetch commands sent by the attacker and access command outputs from any victim machine. This is because the PAT token is embedded in the binary and can be used by anyone who obtains it.

### SHELBY family conclusion

While the C2 infrastructure is designed exotically, the attacker has overlooked the significant risks and implications of this approach. 

We believe using this malware, whether by an authorized red team or a malicious actor, would constitute malpractice. It enables any victim to weaponize the embedded PAT and take control of all active infections. Additionally, if a victim uploads samples to platforms like VirusTotal or MalwareBazaar, any third party could access infection-related data or take over the infections entirely.

## REF8685 campaign analysis

Elastic Security Labs discovered REF8685 through routine collection and analysis of third-party data sources. While studying the REF8685 intrusion, we identified a loader and a C2 implant that we determined to be novel, leading us to release this detailed malware and intrusion analysis. 

The malicious payloads were delivered to an Iraq-based telecom through a highly targeted phishing email sent from within the targeted organization. The text of the email is a discussion amongst engineers regarding the technical specifics of managing the network. Based on the content and context of the email, it is not likely that this lure was crafted externally, indicating the compromise of engineer endpoints, mail servers, or both.

```text
Dears,

We would appreciate it if you would check the following alarms on Core Network many (ASSOCIATION) have been flapped.

Problem Text
*** ALARM 620 A1/APT "ARHLRF2SPX1.9IP"U 250213 1406
M3UA DESTINATION INACCESSIBLE
DEST            SPID
2-1936          ARSMSC1
END

Problem Text
*** ALARM 974 A1/APT "ARHLRF1SPX1.9IP"U 250213 1406
M3UA DESTINATION INACCESSIBLE
DEST            SPID
2-1936          ARSMSC1
END
…
```

This email contains a call to action to address network alarms and a zipped attachment named `details.zip`. Within that zip file is a text file containing the logs addressed in the email and a Windows executable (`JPerf-3.0.0.exe`), which starts the execution chain, resulting in the delivery of the SHELBYC2 implant, providing remote access to the environment.

While not observed in the REF8685 intrusion, it should be noted that VirusTotal shows that `JPerf-3.0.0.exe` ([feb5d225fa38efe2a627ddfbe9654bf59c171ac0742cd565b7a5f22b45a4cc3a](https://www.virustotal.com/gui/file/feb5d225fa38efe2a627ddfbe9654bf59c171ac0742cd565b7a5f22b45a4cc3a/relations)) was included in a separate compressed archive (`JPerf-3.0.0.zip`)and also submitted from Iraq. It is unclear if this is from the same victim or another in this campaign. A file similarity search also identifies a second implant named `Setup.exe` with an additional compressed archive ([5c384109d3e578a0107e8518bcb91cd63f6926f0c0d0e01525d34a734445685c](https://www.virustotal.com/gui/file/5c384109d3e578a0107e8518bcb91cd63f6926f0c0d0e01525d34a734445685c/detection)).

Analysis of these files (`JPerf-3.0.0.exe` and `Setup.exe`) revealed the use of GitHub for `C2` and AES key retrieval mechanisms (more on this in the malware analysis sections). The Github accounts (`arthurshellby` and `johnshelllby`) used for the REF8685 malware were malicious and have been shut down by Github.

Of note, Arthur and John Shelby are characters in the British crime drama television series [Peaky Blinders](https://en.wikipedia.org/wiki/Peaky_Blinders_(TV_series)). The show was in production from 2013 to 2022.

The domain `arthurshelby[.]click` pointed to` 2.56.126[.]151`, a Stark Industries (AS44477) hosted server. This VPS hosting provider [has been used for proxy services](https://krebsonsecurity.com/2024/05/stark-industries-solutions-an-iron-hammer-in-the-cloud/) in other large-scale cyber attacks. This server has overlapping resolutions for:

* `arthurshelby[.]click`
* `[REDACTED]telecom[.]digital`
* `speed-test[.]click`
* `[REDACTED]airport[.]cloud`
* `[REDACTED]airport[.]pro`

![DNS resolution timeline for 2.56.126[.]151](/assets/images/the-shelby-strategy/image19.png "DNS resolution timeline for .56.126[.]151")

The compressed archive and C2 domains for one of the SHELBYLOADER samples are named after [REDACTED] Telecom, an Iraq-based telecommunications company. [REDACTED]’s coverage map focuses on the Iraqi-Kurdistan region in the North and East of the country.

“Sharjaairport” indicates a probable third targeted victim. [REDACTED] International Airport ([REDACTED]) is an international airport specializing in air freight in the United Arab Emirates. It is 14.5 miles (23.3km) from Dubai International Airport (DXB).

![DNS resolution timeline for [REDACTED]airport[.]cloud](/assets/images/the-shelby-strategy/image29.png "DNS resolution timeline for [REDACTED]airport[.]cloud")

`[REDACTED]airport[.]cloud` resolved to a new server, `2.56.126[.]157`, for one day on Jan 21, 2025. Afterward, it pointed to Google DNS, the legitimate [REDACTED] Airport server, and finally, a Namecheap parking address. The `2.56.126[.]157` server, Stark Industries (AS44477) hosted, also hosts `[REDACTED]-connect[.]online`, [REDACTED] is the airport code for the [REDACTED] International Airport. 

The domain` [REDACTED]airport[.]cloud` has a subdomain `portal.[REDACTED]airport[.]cloud` that briefly pointed to `2.56.126[.]188` from Jan 23-25, 2025. It then directed traffic to `172.86.68[.]55` until the time of writing.

Banner hash pivots reveal an additional server-domain combo: `195.16.74[.]138`, `[REDACTED]-meeting[.]online`.

The `172.86.68[.].55` server also hosts `mail.[REDACTED]tell[.]com`, an apparent phishing domain targeting our original victim.

![DNS resolution timeline for 172.86.68[.].55](/assets/images/the-shelby-strategy/image11.png "DNS resolution timeline for 172.86.68[.].55")

A web login page was hosted at `hxxps://portal.[REDACTED]airport[.]cloud/Login` ([VirusTotal](https://www.virustotal.com/gui/file/02dc15a3bd3a911f6ac9c9e8633c7986f06372a514fc5bf75373b9901c6a9628/relations)).  

We assess that the attackers weaponized these two sub-domains to phish for cloud login credentials. Once these credentials were secured (in the case of [REDACTED] Telecom), the attackers accessed the victim's cloud email and crafted a highly targeted phish by weaponizing ongoing internal email threads.

This weaponized internal email was used to re-phish their way onto victim endpoints.

All domains associated with this campaign have utilized ZeroSSL certifications and have been on Stark Industries infrastructure.

### The Diamond Model of intrusion analysis

Elastic Security Labs utilizes the [Diamond Model](https://www.activeresponse.org/wp-content/uploads/2013/07/diamond.pdf) to describe high-level relationships between the adversaries, capabilities, infrastructure, and victims of intrusions. While the Diamond Model is most commonly used with single intrusions, and leveraging Activity Threading (section 8) as a way to create relationships between incidents, an adversary-centered (section 7.1.4) approach allows for a, although cluttered, single diamond.

![REF8685 represented in the Diamond Model](/assets/images/the-shelby-strategy/image10.png "REF8685 represented in the Diamond Model")

## REF8685 and MITRE ATT&CK

Elastic uses the [MITRE ATT&CK](https://attack.mitre.org/) framework to document common tactics, techniques, and procedures that advanced persistent threats use against enterprise networks.

### Tactics

Tactics represent the why of a technique or sub-technique. It is the adversary’s tactical goal: the reason for performing an action.

* [Command and Control](https://attack.mitre.org/tactics/TA0011/)
* [Initial Access](https://attack.mitre.org/tactics/TA0001/)
* [Defense Evasion](https://attack.mitre.org/tactics/TA0005/)
* [Discovery](https://attack.mitre.org/tactics/TA0007/)
* [Execution](https://attack.mitre.org/tactics/TA0002/)
* [Exfiltration](https://attack.mitre.org/tactics/TA0010/)

### Techniques

Techniques represent how an adversary achieves a tactical goal by performing an action.

* [Reflective Code Loading](https://attack.mitre.org/techniques/T1620/)
* [Phishing](https://attack.mitre.org/techniques/T1566/)
* [Obfuscated Files or Information](https://attack.mitre.org/techniques/T1027/)
* [Command and Scripting Interpreter](https://attack.mitre.org/techniques/T1059/)
* [Exfiltration Over C2 Channel](https://attack.mitre.org/techniques/T1041/)

## YARA rule

Elastic Security has created YARA rules to identify this activity. Below are YARA rules to identify the SHELBYC2 and SHELBYLOADER malware:

```
rule Windows_Trojan_ShelbyLoader {
    meta:
        author = "Elastic Security"
        creation_date = "2025-03-11"
        last_modified = "2025-03-25"
        os = "Windows"
        arch = "x86"
        category_type = "Trojan"
        family = "ShelbyLoader"
        threat_name = "Windows.Trojan.ShelbyLoader"
        license = "Elastic License v2"

    strings:
        $a0 = "[WARN] Unusual parent process detected: "
        $a1 = "[ERROR] Exception in CheckParentProcess:" fullword
        $a2 = "[INFO] Sandbox Not Detected by CheckParentProcess" fullword
        $b0 = { 22 63 6F 6E 74 65 6E 74 22 3A 20 22 2E 2B 3F 22 }
        $b1 = { 22 73 68 61 22 3A 20 22 2E 2B 3F 22 }
        $b2 = "Persist ID: " fullword
        $b3 = "https://api.github.com/repos/" fullword
    condition:
        all of ($a*) or all of ($b*)
}

rule Windows_Trojan_ShelbyC2 {
    meta:
        author = "Elastic Security"
        creation_date = "2025-03-11"
        last_modified = "2025-03-25"
        os = "Windows"
        arch = "x86"
        category_type = "Trojan"
        family = "ShelbyC2"
        threat_name = "Windows.Trojan.ShelbyC2"
        license = "Elastic License v2"

    strings:
        $a0 = "File Uploaded Successfully" fullword
        $a1 = "/dlextract" fullword
        $a2 = "/evoke" fullword
        $a4 = { 22 73 68 61 22 3A 20 22 2E 2B 3F 22 }
        $a5 = { 22 2C 22 73 68 61 22 3A 22 }
    condition:
        all of them
}
```


## Observations

All observables are also available for [download](https://github.com/elastic/labs-releases/tree/main/indicators/shelby-strategy) in both ECS and STIX format in a combined zip bundle.

The following observables were discussed in this research.

| Observable                                                       | Type        | Name            | Reference                |
|------------------------------------------------------------------|-------------|-----------------|--------------------------|
| `0e25efeb4e3304815f9e51c1d9bd3a2e2a23ece3a32f0b47f829536f71ead17a` | SHA-256     | `details.zip`     | Lure zip file            |
| `feb5d225fa38efe2a627ddfbe9654bf59c171ac0742cd565b7a5f22b45a4cc3a` | SHA-256     | `JPerf-3.0.0.exe` |                          |
| `0354862d83a61c8e69adc3e65f6e5c921523eff829ef1b169e4f0f143b04091f` | SHA-256     | `HTTPService.dll` | SHELBYLOADER             |
| `fb8d4c24bcfd853edb15c5c4096723b239f03255f17cec42f2d881f5f31b6025` | SHA-256     | `HTTPApi.dll`     | SHELBYC2                 |
| `472e685e7994f51bbb259be9c61f01b8b8f35d20030f03215ce205993dbad7f5` | SHA-256     | `JPerf-3.0.0.zip` | Lure zip file            |
| `5c384109d3e578a0107e8518bcb91cd63f6926f0c0d0e01525d34a734445685c` | SHA-256     | `Setup.exe`       |                          |
| `e51c6f0fbc5a7e0b03a0d6e1e1d26ab566d606b551c785bf882e9a02f04c862b` | SHA-256     |                 | Lure zip file            |
| `github[.]com/johnshelllby`                                          | URL         |                 | GitHub Account name - C2 |
| `github[.]com/arturshellby`                                         | URL         |                 | GitHub Account name - C2 |
| `arthurshelby[.]click`                                             | domain-name |                 | DNS domain               |
| `speed-test[.]click`                                               | domain-name |                 |                          |
| `2.56.126[.]151`                                                   | ipv4        |                 |                          |
| `2.56.126[.]157`                                                   | ipv4        |                 |                          |
| `2.56.126[.]188`                                                   | ipv4        |                 |                          |
| `172.86.68[.]55`                                                   | ipv4        |                 |                          |
| `195.16.74[.]138`                                                  | ipv4        |                 |                          |