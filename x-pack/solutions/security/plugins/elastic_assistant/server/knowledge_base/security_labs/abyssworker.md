---
title: "Shedding light on the ABYSSWORKER driver"
slug: "abyssworker"
date: "2025-03-20"
description: "Elastic Security Labs describes ABYSSWORKER, a malicious driver used with the MEDUSA ransomware attack-chain to disable anti-malware tools."
author:
  - slug: cyril-francois
image: "abyssworker.jpg"
category:
  - slug: malware-analysis
tags: 
  - abyssworker
  - medusa
  - poortry
---

# Summary

Cybercriminals are increasingly bringing their own drivers — either exploiting a vulnerable legitimate driver or using a custom-built driver to disable endpoint detection and response (EDR) systems and evade detection or prevention capabilities.

Elastic Security Labs has monitored a financially motivated campaign deploying MEDUSA ransomware through the use of a [HEARTCRYPT](https://unit42.paloaltonetworks.com/packer-as-a-service-heartcrypt-malware/)\-packed loader. This loader was deployed alongside a revoked certificate-signed driver from a Chinese vendor we call ABYSSWORKER, which it installs on the victim machine and then uses to target and silence different EDR vendors. This EDR-killer driver was [recently reported](https://www.linkedin.com/pulse/attackers-leveraging-microsoft-teams-defaults-quick-assist-p1u5c/) by ConnectWise in another campaign, using a different certificate and IO control codes, at which time some of its capabilities were discussed. In 2022, Google Cloud Mandiant disclosed a malicious driver called [POORTRY](https://cloud.google.com/blog/topics/threat-intelligence/hunting-attestation-signed-malware/) which we believe is the earliest mention of this driver. 

In this article, we take an in-depth look at this driver, examining its various features and techniques. We also provide relative virtual addresses (RVA) under each reversed code screenshot to link the research with the reference sample, along with a small client example that you can use to further experiment with this malware.

# Technical Analysis

## PE header

The binary is a 64-bit Windows PE driver named `smuol.sys`, and imitates a legitimate CrowdStrike Falcon driver.

![ABYSSWORKER driver PE header description](/assets/images/abyssworker/image5.png)

At the time of analysis, we found a dozen samples on VirusTotal, dating from 2024-08-08 to 2025-02-24. Most were VMProtect packed, but two — referenced in the observable tables below — weren’t protected.

All samples are signed using likely stolen, revoked certificates from Chinese companies. These certificates are widely known and shared across different malware samples and campaigns but are not specific to this driver. The certificate fingerprints are listed below:

| Fingerprint | Name |
| :---- | :---- |
| `51 68 1b 3c 9e 66 5d d0 b2 9e 25 71 46 d5 39 dc`  | Foshan Gaoming Kedeyu Insulation Materials Co., Ltd |
| `7f 67 15 0f bb 0d 25 4e 47 42 84 c7 f7 81 9c 4f`  | FEI XIAO  |
| `72 88 1f 10 cd 24 8a 33 e6 12 43 a9 e1 50 ec 1d`  | Fuzhou Dingxin Trade Co., Ltd.  |
| `75 e8 e7 b9 04 3b 13 df 60 e7 64 99 66 30 21 c1`  | Changsha Hengxiang Information Technology Co., Ltd |
| `03 93 47 e6 1d ec 6f 63 98 d4 d4 6b f7 32 65 6c`  | Xinjiang Yishilian Network Technology Co., Ltd  |
| `4e fa 7e 7b ba 65 ec 1a b7 74 f2 b3 13 57 d5 99`  | Shenzhen Yundian Technology Co., Ltd |

## Obfuscation

ABYSSWORKER uses functions that always return the same value, relying on a combination of opaque predicates and other derivation functions. For example, the zero-returning function below always returns a `0` based on hardcoded derived values.

![Zero-Returning function `0x3238`](/assets/images/abyssworker/image7.png)

Below is one of the derivation functions:

![Derivation function `0xF0B4`](/assets/images/abyssworker/image26.png)

These constant-returning functions are called repeatedly throughout the binary to hinder static analysis. However, there are only three such functions, and they aren't used in any predicate but are simply called. We can easily identify them, making this an inefficient obfuscation scheme.

![Example of constant-returning function calls `0x10D2`](/assets/images/abyssworker/image20.png)

## Initialization

Upon initialization, the driver begins by obtaining pointers to several kernel modules and its client protection feature, which will be discussed in the following sections.

![Loading pointers on kernel modules `0x63E2`](/assets/images/abyssworker/image35.png)

![Initializing client protection feature 0x65c3](/assets/images/abyssworker/image28.png)

Then, it creates a device with the path `\\device\\czx9umpTReqbOOKF` and a symbolic link with the path `\\??\\fqg0Et4KlNt4s1JT`.

![Creating device `0x2F45`](/assets/images/abyssworker/image11.png)

![Creating symbolic link `0x2FDA`](/assets/images/abyssworker/image17.png)

It completes initialization by registering callbacks for its major functions.

![Registering driver major functions callbacks `0x3067`](/assets/images/abyssworker/image14.png)

## Client protection on device opening

When the driver device is opened, the `IRP_MJ_CREATE` major callback is called. This function is responsible for adding the process ID to the list of processes to protect and for stripping any pre-existing handles to the target process from the list of running processes.

The function retrieves the process ID from the current kernel thread since the kernel callback is executed in the context of the client process when the device is opened.

![Get client PID from current thread `0x138B`](/assets/images/abyssworker/image33.png)

Before adding the process ID to the protection list, ABYSSWORKER searches for and strips any existing handles to the client process in other running processes.

To achieve this, the malware iterates over existing processes by brute-forcing their Process IDs (PIDs) to avoid reliance on any API. For each process, it iterates over their handles, also using brute force, and checks if the underlying object corresponds to the client process. If a match is found, it strips the access rights using the value passed as a parameter (`0x8bb`).

![ABYSSWORKER stripping existing handles to the client from other processes `0x9EDB`](/assets/images/abyssworker/image21.png)

![ABYSSWORKER setting access rights of client handle if found in process `0xA691`](/assets/images/abyssworker/image4.png)

Finally, it adds the PID to the global list of protected processes.

![Client PID is added to the global protected processes list `0x9F43`](/assets/images/abyssworker/image22.png)

As mentioned earlier, the driver sets up its protection feature during the initialization phase. This protection relies on registering two `pre-operation` callbacks using the `ObRegisterCallback` API: one to detect the opening of handles to its protected processes and another to detect the opening of handles to the threads of those protected processes.

The two callbacks operate in the same way: they set the desired access for the handle to zero, effectively denying the creation of the handle.

![Registration of callbacks to catch thread and process opening to protected client `0xA2B0`](/assets/images/abyssworker/image18.png)

![Denying access to protected process handle `0xA0A6`](/assets/images/abyssworker/image10.png)

## DeviceIoControl handlers

Upon receiving a device I/O control request, ABYSSWORKER dispatches the request to handlers based on the I/O control code. These handlers cover a wide range of operations, from file manipulation to process and driver termination, providing a comprehensive toolset that can be used to terminate or permanently disable EDR systems.

We detail the different IO controls in the table below:

| Name | Code |
| :---- | :---- |
| Enable malware | `0x222080` |
| Copy file | `0x222184` |
| Remove callbacks and devices by module name | `0x222400` |
| Replace driver major functions by module name | `0x222404` |
| Kill system threads by module name | `0x222408` |
| Detach mini filter devices | `0x222440` |
| Delete file | `0x222180` |
| Disable malware | `0x222084` |
| Load api | `0x2220c0` |
| Decrease all drivers reference counter | `0x222100` |
| Decrease all devices reference counter | `0x222104` |
| Terminate process | `0x222144` |
| Terminate thread | `0x222140` |
| Removing hooks from Ntfs and Pnp drivers' major functions | `0x222444` |
| Reboot | `0x222664` |

### Enabling the malware (0x222080)

As discussed in this [blog post](https://www.linkedin.com/pulse/attackers-leveraging-microsoft-teams-defaults-quick-assist-p1u5c/), the client must enable the driver by sending a password (`7N6bCAoECbItsUR5-h4Rp2nkQxybfKb0F-wgbJGHGh20pWUuN1-ZxfXdiOYps6HTp0X`) to the driver, in our case it’s through the `0x222080` IO control.

The handler simply compares the user input with the hardcoded password. If correct, it sets a global flag to true (1). This flag is checked in all other handlers to permit or deny execution.

![Hardcoded password `0x12000`](/assets/images/abyssworker/image1.png)

![Enabling malware if the password is correct `0x184B`](/assets/images/abyssworker/image3.png)

### Loading the API (0x2220c0)

Most handlers in the malware rely on kernel APIs that must be loaded using this handler. This handler loads these globals along with several structures, using the kernel module pointers previously loaded during initialization. Once the loading is complete, a global flag is set to signal the availability of these APIs.

![Set the global flag to `1` once the API is loaded `0x1c28`](/assets/images/abyssworker/image29.png)

This handler has two modes of operation: a full mode and a partial mode. In full mode, it loads the APIs using a mapping structure of function names and RVA provided by the user as input to the IO control. In partial mode, it searches for some of the APIs on its own but does not load all the APIs that are loaded in full mode, hence the term partial mode. If the user opts for partial mode due to the inability to provide this mapping structure, some handlers will not execute. In this chapter, we only cover the full mode of operation.

We detail the structures used below:

```c
#define AM_NAME_LENGTH 256
typedef struct _struct_435
{
   uint64_t rva;
   char name[AM_NAME_LENGTH];
} struct_435_t;

#define AM_ARRAY_LENGTH 1024
typedef struct _struct_433
{
   struct_435_t array[AM_ARRAY_LENGTH];
   uint32_t length;
} struct_433_t;
```

We provide a short example of usage below:

```c
struct_433_t api_mapping = {
    .length = 25,
    .array = {
        [0] = {.rva = 0xcec620, .name = "PspLoadImageNotifyRoutine"},
        [1] = {.rva = 0xcec220, .name = "PspCreateThreadNotifyRoutine"},
        [2] = {.rva = 0xcec420, .name = "PspCreateProcessNotifyRoutine"},
        // (...)
        [24] = {.rva = 0x250060, .name = "NtfsFsdShutdown"},
}};

uint32_t malware_load_api(HANDLE device)
{
    return send_ioctrl(device, IOCTRL_LOAD_API, &api_mapping, sizeof(struct_433_t), NULL, 0);
}
```

To load its API, the function starts by loading three 'callback lists' from different kernel object types. These are used by the handler that removes registered notification callbacks belonging to a specific module.

![ABYSSWORKER getting callback list from kernel’s _OBJECT_TYPEs `0x5502`](/assets/images/abyssworker/image23.png)

Then, it loads pointers to functions by using the provided structure, simply by searching for the function name and adding the associated RVA to the module's base address.

![Get function RVA from structure `0x5896`](/assets/images/abyssworker/image9.png)

![Search RVA associated with function name in structure `0x3540`](/assets/images/abyssworker/image6.png)

This is done for the following 25 functions:

* `PspLoadImageNotifyRoutine`  
* `PspCreateThreadNotifyRoutine`  
* `PspCreateProcessNotifyRoutine`  
* `CallbackListHead`  
* `PspSetCreateProcessNotifyRoutine`  
* `PspTerminateThreadByPointer`  
* `PsTerminateProcess`  
* `IopInvalidDeviceRequest`  
* `ClassGlobalDispatch`  
* `NtfsFsdRead`  
* `NtfsFsdWrite`  
* `NtfsFsdLockControl`  
* `NtfsFsdDirectoryControl`  
* `NtfsFsdClose`  
* `NtfsFsdCleanup`  
* `NtfsFsdCreate`  
* `NtfsFsdDispatchWait`  
* `NtfsFsdDispatchSwitch`  
* `NtfsFsdDispatch`  
* `NtfsFsdFlushBuffers`  
* `NtfsFsdDeviceControl`  
* `NtfsFsdFileSystemControl`  
* `NtfsFsdSetInformation`  
* `NtfsFsdPnp`  
* `NtfsFsdShutdown`

### File copy and deletion (0x222184, 0x222180)

To copy or delete files, ABYSSWORKER relies on a strategy that, although not new, remains interesting. Instead of using a common API like `NtCreateFile`, an I/O Request Packet (IRP) is created from scratch and sent directly to the corresponding drive device containing the target file.

#### Creating a file

The file creation function is used to showcase how this mechanism works. The function starts by obtaining the drive device from the file path. Then, a new file object is created and linked to the target drive device, ensuring that the new object is properly linked to the drive.

![Building a new file object `0x7A14`](/assets/images/abyssworker/image15.png)

Then, it creates a new IRP object and sets all the necessary data to perform the file creation operation. The major function targeted by this IRP is specified in the `MajorFunction` property, which, in this case, is set to `IRP_MJ_CREATE`, as expected for file creation.

![Building new IRP `0x7C68`](/assets/images/abyssworker/image16.png)

Then, the malware sends the IRP to the target drive device. While it could have used the `IoCallDriver` API to do so, it instead sends the IRP manually by calling the corresponding device's major function.

![Sending IRP to device `0x9B14`](/assets/images/abyssworker/image15.png)

At this point, the file object is valid for further use. The handler finishes its work by incrementing the reference counter of the file object and assigning it to its output parameter for later use.

#### Copying a file

To copy a file, ABYSSWORKER opens both the source and destination files, then reads (`IRP_MJ_READ`) from the source and writes (`IRP_MJ_WRITE`) to the destination.

![Copying file using IRPs `0x4BA8`](/assets/images/abyssworker/image40.png)

![Reading and writing files using IRPs `0x66D9`](/assets/images/abyssworker/image31.png)

#### Deleting a file

The deletion handler sets the file attribute to `ATTRIBUTE_NORMAL` to unprotect any read-only file and sets the file disposition to delete (`disposition_info.DeleteFile = 1`) to remove the file using the `IRP_MJ_SET_INFORMATION` IRP.

![Setting file attribute to normal and deleting it `0x4FB6`](/assets/images/abyssworker/image30.png)

![Building IRP_MJ_SET_INFORMATION IRP to delete file `0x67B4`](/assets/images/abyssworker/image24.png)

### Notification callbacks removal by module name (0x222400)

Malware clients can use this handler to blind EDR products and their visibility. It searches for and removes all registered notification callbacks. The targeted callbacks are those registered with the following APIs:

- `PsSetCreateProcessNotifyRoutine`  
- `PsSetLoadImageNotifyRoutine`  
- `PsSetCreateThreadNotifyRoutine`  
- `ObRegisterCallbacks`  
- `CmRegisterCallback`

Additionally, it removes callbacks registered through a MiniFilter driver and, optionally, removes devices belonging to a specific module.

![Deleting notifications callbacks and devices `0x263D`](/assets/images/abyssworker/image34.png)

To delete those notification callbacks, the handler locates them using various methods, such as the three global callback lists previously loaded in the loading API handler, which contain callbacks registered with `ObRegisterCallbacks` and `CmRegisterCallback`. It then deletes them using the corresponding APIs, like `ObUnRegisterCallbacks` and `CmUnRegisterCallbacks`.

Blinding EDR using these methods deserves a whole blog post of its own. To keep this post concise, we won’t provide more details here, but we invite the reader to explore these methods in two well-documented projects that implement these techniques:

- [EDRSandblast](https://github.com/wavestone-cdt/EDRSandblast/tree/master)  
- [RealBlindingEDR](https://github.com/myzxcg/RealBlindingEDR)

### Replace driver major functions by module name `0x222404`

Another way to interfere with a driver is by using this handler to replace all its major functions with a dummy function, thus disabling any interaction with the driver, given a target module name.

To achieve this, ABYSSWORKER iterates through the driver objects in the `Driver` and `Filesystem` object directories. For each driver object, it compares the underlying module name to the target module, and if they match, it replaces all of its major functions with `IopInvalidDeviceRequest`.

![Replacing targeted driver major functions with dummy functions `0x9434`](/assets/images/abyssworker/image36.png)

### Detach mini filter devices (0x222440)

This handler iterates over all driver objects found in the `Driver` and `FileSystem` object directories. For each driver, it explores its device tree and detaches all devices associated with the mini filter driver: `FltMgr.sys`.

![Searching object directories for ```FltMgr.sys``` driver to delete its devices `0xE1D8`](/assets/images/abyssworker/image39.png)

The function works by iterating over the devices of the driver through the `AttachedDevice` and `NextDevice` pointers, retrieving the module name of each device's associated driver, and comparing it to the target module name passed as a parameter (`”FltMgr.sys”`). If the names match, it uses the `IoDetachDevice` function to unlink the device.

![Iterating and detaching all devices by module name `0xB9E`](/assets/images/abyssworker/image32.png)

### Kill system threads by module name (0x222408)

This handler iterates over threads by brute-forcing their thread IDs and kills them if the thread is a system thread and its start address belongs to the targeted module.

![Brute-forcing threads to find and terminate targeted module system threads `0xECE6`](/assets/images/abyssworker/image8.png)

To terminate the thread, the malware queues an APC (asynchronous procedure call) to execute code in the context of the targeted thread. Once executed, this code will, in turn, call `PsTerminateSystemThread`.

![ABYSSWORKER queuing APC to terminate target thread `0x10A6`](/assets/images/abyssworker/image27.png)

### Terminate process and terminate thread (0x222144, 0x222140)

With these two handlers you can terminate any process or a thread by their PID or Thread ID (TID) using `PsTerminateProcess` and `PsTerminateThread`.

![Terminating process by PID `0x2081`](/assets/images/abyssworker/image37.png)

![Terminating thread by TID `0x1F07`](/assets/images/abyssworker/image13.png)

### Removing hooks from Ntfs and Pnp drivers' major functions (0x222444)

On top of registering notification callbacks, some EDRs like to hook major functions of the `NTFS` and `PNP` drivers. To remove those hooks, the malware can call this driver to restore the original major functions of those drivers.

![Restoring hooked NTFS and PNP driver major functions `0x2D32`](/assets/images/abyssworker/image25.png)

ABYSSWORKER simply iterates over each registered major function, checks if the function belongs to the driver module, and if not, it means the function has been hooked, so it replaces it with the original functions.

![Restoring major function if hooked `0x43AD`](/assets/images/abyssworker/image38.png)

### Reboot `0x222664`

To reboot the machine, this handler uses the undocumented function `HalReturnToFirmware`.

![ABYSSWORKER reboot the machine from the kernel `0x2DC0`](/assets/images/abyssworker/image19.png)

# Client implementation example

In this blog post, we provide a small client implementation example. This example works with the reference sample and was used to debug it, but doesn’t implement all the IOCTRLs for the driver and is unlikely to be updated in the future. 

However, it contains all the functions to enable it and load its API, so we hope that any motivated reader, with the help of the information in this article, will be able to extend it and further experiment with this malware.

![Client example output](/assets/images/abyssworker/image2.png)

The repository of the project is available [here](https://github.com/elastic/labs-releases/tree/main/tools/abyssworker/client).

# Malware and MITRE ATT&CK

Elastic uses the [MITRE ATT&CK](https://attack.mitre.org/) framework to document common tactics, techniques, and procedures that threats use against enterprise networks.

## Tactics

- [Defense Evasion](https://attack.mitre.org/tactics/TA0005)

## Techniques

Techniques represent how an adversary achieves a tactical goal by performing an action.

- [File and Directory Permissions Modification](https://attack.mitre.org/techniques/T1222)  
- [Disable or Modify Tools](https://attack.mitre.org/techniques/T1562/001)   
- [Code Signing](https://attack.mitre.org/techniques/T1553/002) 

# Mitigations

## YARA

Elastic Security has created the following YARA rules related to this post:

- [https://github.com/elastic/protections-artifacts/blob/main/yara/rules/Windows\_Rootkit\_AbyssWorker.yar](https://github.com/elastic/protections-artifacts/blob/main/yara/rules/Windows_Rootkit_AbyssWorker.yar)

# Observations

The following observables were discussed in this research:

| Observable | Type | Reference | Date |
| :---- | :---- | :---- | :---- |
| `6a2a0f9c56ee9bf7b62e1d4e1929d13046cd78a93d8c607fe4728cc5b1e8d050` | SHA256 | ABYSSWORKER reference sample | VT first seen: 2025-01-22 |
| `b7703a59c39a0d2f7ef6422945aaeaaf061431af0533557246397551b8eed505` | SHA256 | ABYSSWORKER sample | VT first seen: 2025-01-27 |

# References

- Google Cloud Mandiant, Mandiant Intelligence. I Solemnly Swear My Driver Is Up to No Good: Hunting for Attestation Signed Malware\. [https://cloud.google.com/blog/topics/threat-intelligence/hunting-attestation-signed-malware/](https://cloud.google.com/blog/topics/threat-intelligence/hunting-attestation-signed-malware/)
- Unit42, Jerome Tujague, Daniel Bunce. Crypted Hearts: Exposing the HeartCrypt Packer-as-a-Service Operation, December 13, 2024\. [https://unit42.paloaltonetworks.com/packer-as-a-service-heartcrypt-malware/](https://unit42.paloaltonetworks.com/packer-as-a-service-heartcrypt-malware/)  
- ConnectWise, Blake Eakin. "Attackers Leveraging Microsoft Teams Defaults and Quick Assist for Social Engineering Attacks", January 31 2025\. [https://www.linkedin.com/pulse/attackers-leveraging-microsoft-teams-defaults-quick-assist-p1u5c/](https://www.linkedin.com/pulse/attackers-leveraging-microsoft-teams-defaults-quick-assist-p1u5c/)  
- wavestone-cdt, Aug 30, 2024\. [https://github.com/wavestone-cdt/EDRSandblast/tree/master](https://github.com/wavestone-cdt/EDRSandblast/tree/master)  
- myzxcg, May 24, 2024\. [https://github.com/myzxcg/RealBlindingEDR](https://github.com/myzxcg/RealBlindingEDR)
