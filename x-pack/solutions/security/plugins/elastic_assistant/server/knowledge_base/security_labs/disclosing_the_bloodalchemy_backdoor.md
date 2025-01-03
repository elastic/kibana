---
title: "Disclosing the BLOODALCHEMY backdoor"
slug: "disclosing-the-bloodalchemy-backdoor"
date: "2023-10-13"
description: "BLOODALCHEMY is a new, actively developed, backdoor that leverages a benign binary as an injection vehicle, and is a part of the REF5961 intrusion set."
author:
  - slug: cyril-francois
image: "photo-edited-05@2x.jpg"
category:
  - slug: security-research
  - slug: malware-analysis
tags:
  - security-research
  - malware-analysis
  - ref5961
  - bloodalchemy
---

## Preamble

BLOODALCHEMY is an x86 backdoor written in C and found as shellcode injected into a signed benign process. It was discovered in our analysis and is part of the REF5961 intrusion set, which you can read about [here](https://www.elastic.co/security-labs/introducing-the-ref5961-intrusion-set). 

BLOODALCHEMY requires a specific loader to be run because it isn't reflexive (it doesn’t have the capability to load and execute by itself). Additionally, BLOODALCHEMY isn’t compiled as position independent (when loaded at a different base address than the preferred one the binary has to be patched to take into account the new “position”). 

In our analysis, the signed benign process was previously sideloaded with a malicious DLL. The DLL was missing from the sample data but was likely the container and the loader of the BLOODALCHEMY shellcode.

We believe from our research that the malware is part of a bigger toolset and is still in active development based on its current lack of capabilities, enabled debug logging of exceptions, and the existence of test strings used for persistence service setup.

## Key takeaways
* BLOODALCHEMY is likely a new backdoor and is still in active development
* BLOODALCHEMY abuses a legitimate binary for loading
* BLOODALCHEMY has multiple running modes, persistence mechanisms, and communication options

## Initial execution

During the initial execution phase, the adversary deployed a benign utility, `BrDifxapi.exe`, which is vulnerable to DLL side-loading. When deploying this vulnerable utility the adversary could side-load the unsigned BLOODALCHEMY loader (`BrLogAPI.dll`) and inject shellcode into the current process.

![Command-line used to execute the BLOODALCHEMY loader](/assets/images/disclosing-the-bloodalchemy-backdoor/image4.png)


![Fake BrLogApi.dll, part of BLOODALCHEMY toolset, sideloaded by BrDifxapi.exe](/assets/images/disclosing-the-bloodalchemy-backdoor/image15.png)


`BrDifxapi.exe` is a binary developed by the Japanese company [Brother Industries](https://global.brother/en/gateway) and the version we observed has a revoked signature.

![BrDifxapi.exe with revoked signature](/assets/images/disclosing-the-bloodalchemy-backdoor/image6.png)


The legitimate DLL named `BrLogApi.dll` is an unsigned DLL also by Brother Industries. BLOODALCHEMY uses the same DLL name.

![The legitimate BrLogApi.dll is an unsigned DLL file](/assets/images/disclosing-the-bloodalchemy-backdoor/image25.jpg)


## Code analysis

### Data Obfuscation

To hide its strings the BLOODALCHEMY malware uses a classic technique where each string is encrypted, preceded by a single-byte decryption key, and finally, all concatenated together to form what we call an encrypted blob.

While the strings are not null-terminated, the offset from the beginning of the blob, the string, and the size are passed as a parameter to the decryption function. Here is the encrypted blob format:

_Blob = Key0 :EncryptedString0 + Key1:EncryptedString1 + ... + KeyN:EncryptedStringN_

The implementation in Python of the string decryption algorithm is given below: 

```Python
def decrypt_bytes(encrypted_data: bytes, offset: int, size: int) -> bytes:
    decrypted_size = size - 1
    decrypted_data = bytearray(decrypted_size)

    encrypted_data_ = encrypted_data[offset : offset + size]
    key = encrypted_data_[0]

    i = 0
    while i != decrypted_size:
            decrypted_data[i] = key ^ encrypted_data_[i + 1]
           key = (key + ((key << ((i % 5) + 1)) | (key >> (7 - (i % 5))))) & 0xFF
           i += 1

    return bytes(decrypted_data)
```

The strings contained in the configuration blob are encrypted using the same scheme, however the ids (or offsets) of each string are obfuscated; it adds two additional layers of obfuscation that must be resolved. Below, we can resolve additional obfuscation layers to decrypt strings from the configuration:

```Python
def decrypt_configuration_string(id: int) -> bytes:
        return decrypt_bytes(
                *get_configuration_encrypted_string(
                        get_configuration_dword(id)))
```

Each function is given below:

**The `get_configuration_dword` function**
```Python
def get_configuration_dword(id: int) -> int:
        b = ida_bytes.get_bytes(CONFIGURATION_VA + id, 4)
        return b[0] + (b[1] + (b[2] + (b[3] << 8) << 8) << 8)
```

**The `get_configuration_encrypted_strng` function**
```Python
def get_configuration_encrypted_string(id: int) -> tuple[int, int]:
         ea = CONFIGURATION_VA + id

        v2 = 0
        i = 0

        while i <= 63:
            c = ida_bytes.get_byte(ea)

            v6 = (c & 127) << i
            v2 = (v2 | v6) & 0xFFFFFFFF

            ea += 1

            if c >= 0:
                break
            
            i += 7
            return ea, v2
```

### Persistence

BLOODALCHEMY maintains persistence by copying itself into its persistence folder with the path suffix `\Test\test.exe`, 

![BLOODALCHEMY folder and binary name](/assets/images/disclosing-the-bloodalchemy-backdoor/image24.png)


The root directory of the persistence folder is chosen based on its current privilege level, it can be either:
* `%ProgramFiles%`
* `%ProgramFiles(x86)%`
* `%Appdata%`
* `%LocalAppData%\Programs`

![BLOODALCHEMY root persistence folder choice](/assets/images/disclosing-the-bloodalchemy-backdoor/image10.png)


Persistence is achieved via different methods depending on the configuration:
* As a service
* As a registry key
* As a scheduled task
* Using [COM](https://learn.microsoft.com/en-us/windows/win32/learnwin32/what-is-a-com-interface-) interfaces

To identify the persistence mechanisms, we can use the uninstall command to observe the different ways that the malware removes persistence.

As a service named `Test`.

![BLOODALCHEMY deleting previously installed service](/assets/images/disclosing-the-bloodalchemy-backdoor/image11.png)


As a registry key at `CurrentVersion\Run`

![BLOODALCHEMY deleting “CurrentVersion\Run” persistence registry key](/assets/images/disclosing-the-bloodalchemy-backdoor/image13.png)


As a scheduled task, running with SYSTEM privilege via `schtask.exe`:
```
b'schtasks.exe /CREATE /SC %s /TN "%s" /TR "\'%s\'" /RU "NT AUTHORITY\\SYSTEM" /Fb'
```

Using the `TaskScheduler::ITaskService` COM interface. The intent of this persistence mechanism is currently unknown.

![Instantiation of the ITaskService COM interface](/assets/images/disclosing-the-bloodalchemy-backdoor/image29.png)


### Running modes

The malware has different running modes depending on its configuration:
* Within the main or separate process thread
* Create a Windows process and inject a shellcode into it
* As a service

The malware can either work within the main process thread.

![Capability function called within the main function](/assets/images/disclosing-the-bloodalchemy-backdoor/image5.png)


Or run in a separate thread.

![Capability function called in a new thread](/assets/images/disclosing-the-bloodalchemy-backdoor/image12.png)


Or create a Windows process from a hardcoded list and inject a shellcode passed by parameter to the entry point using the [WriteProcessMemory+QueueUserAPC+ResumeThread](https://sevrosecurity.com/2020/04/13/process-injection-part-2-queueuserapc/) method.

![Process injection running method](/assets/images/disclosing-the-bloodalchemy-backdoor/image3.png)


![List of target binaries for process injection](/assets/images/disclosing-the-bloodalchemy-backdoor/image21.png)


The shellcode is contained in the parameters we call `p_interesting_data`. This parameter is actually a pointer to a structure containing both the malware configuration and executable binary data.

![Entrypoint prototype](/assets/images/disclosing-the-bloodalchemy-backdoor/image18.png)


![Provided shellcode copied in the remote process](/assets/images/disclosing-the-bloodalchemy-backdoor/image23.png)


![Final part of the process injection procedure](/assets/images/disclosing-the-bloodalchemy-backdoor/image20.png)


Or install and run itself as a service. In this scenario, the service name and description will be `Test` and `Digital Imaging System`:

![Name and description strings used to install the BLOODALCHEMY service](/assets/images/disclosing-the-bloodalchemy-backdoor/image26.png)


Also when running as a service and started by the service manager the malware will masquerade itself as stopped by first setting the service status to “SERVICE_RUNNING” then setting the status to “SERVICE_STOPPED” while in fact the malware is still running.

![BLOODALCHEMY’s service entry point masquerading service status](/assets/images/disclosing-the-bloodalchemy-backdoor/image30.png)


### Communication

The malware communicates using either the HTTP protocol, named pipes, or sockets.

When using the HTTP protocol the malware requests the following URI `/Inform/logger/.`

![URI used to connect to C2](/assets/images/disclosing-the-bloodalchemy-backdoor/image27.png)


In this scenario, BLOODALCHEMY will try to use any proxy server found in the registry key `SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Internet Settings`.

![Host proxy information gathered from registry](/assets/images/disclosing-the-bloodalchemy-backdoor/image28.png)


We did not uncover any C2 infrastructure with our sample, but the URL could look something like this: `https://malwa[.]re/Inform/logger`

When using a named pipe, the name is randomly generated using the current PID as seed.

![Random pipe name generation seeded with current PID](/assets/images/disclosing-the-bloodalchemy-backdoor/image9.png)


While waiting for a client to connect to this named pipe the malware scans the running processes and checks that its parent process is still running, this may be to limit access to the named pipe. That said, the malware is not checking that the pipe client is the correct parent process, only that the parent process is running. This introduces flawed logic in protecting the named pipe.

![Retrieve parent PID](/assets/images/disclosing-the-bloodalchemy-backdoor/image16.png)


![Flawed check for restricting pipe access to parent process](/assets/images/disclosing-the-bloodalchemy-backdoor/image7.png)


From the malware strings and imports we know that the malware can also operate using TCP/UDP sockets.

![Usage of the socket API in one of the implementations of the “communication” interface](/assets/images/disclosing-the-bloodalchemy-backdoor/image17.png)


While we haven’t made any conclusions about their usage, we list all the protocols found in the encrypted strings.
* DNS://
* HTTP://
* HTTPS://
* MUX://
* UDP://
* SMB://
* SOCKS5://
* SOCKS4://
* TCP://

For all protocols the data can be encrypted, [LZNT1 compressed](https://learn.microsoft.com/en-us/openspecs/windows_protocols/ms-xca/94164d22-2928-4417-876e-d193766c4db6), and/or Base64-encoded.

### Commands

The malware only contains a few commands with actual effects:
* Write/overwrite the malware toolset 
* Launch its malware binary `Test.exe`
* Uninstall and terminate
* Gather host information

There are three commands that write (or overwrite) the malware tool set with the received Base64-encoded binary data:
* Either the malware binary (`Test.exe`)
* the sideloaded DLL (`BrLogAPI.dll`)
* or the main trusted binary (`BrDifxapi.exe`)

![BLOODALCHEMY tool set overwrite commands](/assets/images/disclosing-the-bloodalchemy-backdoor/image8.png)


One command that launches the `Test.exe` binary in the persistence folder.

![BLOODALCHEMY command to run the malware executable binary](/assets/images/disclosing-the-bloodalchemy-backdoor/image19.png)


The uninstall and terminate itself command will first delete all its files at specific locations then remove any persistence registry key or scheduled task, then remove installed service and finish by terminating itself.

![Command to uninstall and terminate itself](/assets/images/disclosing-the-bloodalchemy-backdoor/image14.png)


![Uninstall function](/assets/images/disclosing-the-bloodalchemy-backdoor/image2.png)


One host information gathering command: CPU, OS, display, network, etc.

![Information gathering command](/assets/images/disclosing-the-bloodalchemy-backdoor/image22.png)


## Summary

BLOODALCHEMY is a backdoor shellcode containing only original code(no statically linked libraries). This code appears to be crafted by experienced malware developers.

The backdoor contains modular capabilities based on its configuration. These capabilities include multiple persistence, C2, and execution mechanisms.

While unconfirmed, the presence of so few effective commands indicates that the malware may be a subfeature of a larger intrusion set or malware package, still in development, or an extremely focused piece of malware for a specific tactical usage.

## BLOODALCHEMY and MITRE ATT&CK

Elastic uses the [MITRE ATT&CK](https://attack.mitre.org/) framework to document common tactics, techniques, and procedures that advanced persistent threats used against enterprise networks.

### Tactics

Tactics represent the why of a technique or sub-technique. It is the adversary’s tactical goal: the reason for performing an action.
* [Command and Control](https://attack.mitre.org/tactics/TA0011/)
* [Defense Evasion](https://attack.mitre.org/tactics/TA0005/)
* [Discovery](https://attack.mitre.org/tactics/TA0007/)
* [Execution](https://attack.mitre.org/tactics/TA0002/)
* [Process Injection](https://attack.mitre.org/techniques/T1055/)

## Malware prevention capabilities

* [BLOODALCHEMY](https://github.com/elastic/protections-artifacts/blob/main/yara/rules/Windows_Trojan_BloodAlchemy.yar)

## YARA

Elastic Security has created YARA rules to identify this activity. Below are YARA rules to identify the BLOODALCHEMY malware:

```yara
BLOODALCHEMY
rule Windows_Trojan_BloodAlchemy_1 {
    meta:
        author = "Elastic Security"
        creation_date = "2023-05-09"
        last_modified = "2023-06-13"
        threat_name = "Windows.Trojan.BloodAlchemy"
        license = "Elastic License v2"
        os = "windows"

    strings:
        $a1 = { 55 8B EC 51 83 65 FC 00 53 56 57 BF 00 20 00 00 57 6A 40 FF 15 }
        $a2 = { 55 8B EC 81 EC 80 00 00 00 53 56 57 33 FF 8D 45 80 6A 64 57 50 89 7D E4 89 7D EC 89 7D F0 89 7D }

    condition:
        all of them
}

rule Windows_Trojan_BloodAlchemy_2 {
    meta:
        author = "Elastic Security"
        creation_date = "2023-05-09"
        last_modified = "2023-06-13"
        threat_name = "Windows.Trojan.BloodAlchemy"
        license = "Elastic License v2"
        os = "windows"

    strings:
        $a1 = { 55 8B EC 83 EC 54 53 8B 5D 08 56 57 33 FF 89 55 F4 89 4D F0 BE 00 00 00 02 89 7D F8 89 7D FC 85 DB }
        $a2 = { 55 8B EC 83 EC 0C 56 57 33 C0 8D 7D F4 AB 8D 4D F4 AB AB E8 42 10 00 00 8B 7D F4 33 F6 85 FF 74 03 8B 77 08 }

    condition:
        any of them
}

rule Windows_Trojan_BloodAlchemy_3 {
    meta:
        author = "Elastic Security"
        creation_date = "2023-05-10"
        last_modified = "2023-06-13"
        threat_name = "Windows.Trojan.BloodAlchemy"
        license = "Elastic License v2"
        os = "windows"

    strings:
        $a = { 55 8B EC 83 EC 38 53 56 57 8B 75 08 8D 7D F0 33 C0 33 DB AB 89 5D C8 89 5D D0 89 5D D4 AB 89 5D }

    condition:
        all of them
}

rule Windows_Trojan_BloodAlchemy_4 {
    meta:
        author = "Elastic Security"
        creation_date = "2023-05-10"
        last_modified = "2023-06-13"
        threat_name = "Windows.Trojan.BloodAlchemy"
        license = "Elastic License v2"
        os = "windows"

    strings:
        $a = { 55 8B EC 83 EC 30 53 56 57 33 C0 8D 7D F0 AB 33 DB 68 02 80 00 00 6A 40 89 5D FC AB AB FF 15 28 }

    condition:
        all of them
}
```

## Observations

All observables are also available for [download](https://github.com/elastic/labs-releases/tree/main/indicators/ref5961) in both ECS and STIX format in a combined zip bundle.

The following observables were discussed in this research.

| Observable                                                       | Type    | Name         | Reference           |
|------------------------------------------------------------------|---------|--------------|---------------------|
| `e14ee3e2ce0010110c409f119d56f6151fdca64e20d902412db46406ed89009a` | SHA-256 | `BrLogAPI.dll` | BLOODALCHEMY loader |
| `25268bc07b64d0d1df441eb6f4b40dc44a6af568be0657533088d3bfd2a05455` | SHA-256 | NA | BLOODALCHEMY payload |
