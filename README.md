# MGU Storage Monitor

A small, **read-only** storage-space monitor for BMW iDrive 7 head units with **MGU Store**. It shows **GB free** in green, GB used, total GB, and a usage bar. Values are decimal gigabytes (1 GB = 1,000,000,000 bytes).

## Tested status

v1.2.3 has been installed and opened successfully on a 2021 BMW M4 G82 running iDrive 7 and MGU Store 0.9.35. The storage display was visually checked and works correctly. Compatibility with other vehicles and software versions remains unverified.

The app reads local filesystem statistics and does **not** delete files, clean storage, modify vehicle firmware, or transmit readings to a server. Free filesystem space is **not necessarily the amount available for app installation**. Filesystem reserved space may make free + used smaller than total.

## Install from USB (recommended)

1. Download the **USB installation ZIP** attached to the GitHub Release, not GitHub's automatic *Source code* ZIP.
2. Extract it onto a FAT32 USB stick so that `mgu-repo/storage-monitor/` is present. If `mgu-repo` already exists, replace only its `storage-monitor` folder; do not delete unrelated files.
3. With the car stationary, open **MGU Store → USB → MGU Storage Monitor** and install.
4. Open the app. To uninstall, use **MGU Store → Installed → MGU Storage Monitor → Remove**.

The ZIP contains **source that MGU Store builds on the head unit**; it is not a precompiled BMW firmware image. MGU Store must already be installed. No SSH, E-Sys, or coding is required for this app installation.

## Source repository

This repository contains `mgu-repo.json`, the application under `apps/ab_storage/`, and the build kit. It is provided for inspection and reuse, not as a substitute for the USB installation ZIP.

## Credits and licensing

Developed with AI assistance and tested on the vehicle by its owner. Built using [JustAnotherPU/mgu-apps](https://github.com/JustAnotherPU/mgu-apps) and the [cauliflowermossgrape/idrive7-apps](https://github.com/cauliflowermossgrape/idrive7-apps) kit. Original licence and copyright notices are retained in `LICENSE`, `kit/LICENSE`, and `THIRD_PARTY_LICENSES`.

Community software, provided **as-is**, without warranty. Do not use while driving.
