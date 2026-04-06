# -*- mode: python ; coding: utf-8 -*-
from PyInstaller.utils.win32.versioninfo import (
    VSVersionInfo, FixedFileInfo, StringFileInfo, StringTable, StringStruct, VarFileInfo, VarStruct
)

version_info = VSVersionInfo(
    ffi=FixedFileInfo(
        filevers=(0, 4, 0, 0),
        prodvers=(0, 4, 0, 0),
    ),
    kids=[
        StringFileInfo([
            StringTable('040904B0', [
                StringStruct('CompanyName',      'Tatum Res-Tech'),
                StringStruct('FileDescription',  'Tatum Telemetry Client'),
                StringStruct('FileVersion',      '0.4.0'),
                StringStruct('InternalName',     'TatumClient'),
                StringStruct('LegalCopyright',   '\xa9 2026 Tatum Res-Tech'),
                StringStruct('ProductName',      'Tatum Telemetry Client'),
                StringStruct('ProductVersion',   '0.4.0'),
            ])
        ]),
        VarFileInfo([VarStruct('Translation', [0x0409, 1200])])
    ]
)


a = Analysis(
    ['tatum_client.py'],
    pathex=[],
    binaries=[],
    datas=[('icons', 'icons')],
    hiddenimports=[],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='TatumClient',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=['icons\\icon.ico'],
    version=version_info,
)
