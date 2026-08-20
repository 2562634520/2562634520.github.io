"""安装萌梦 3D Bridge 到当前 Maya 用户脚本目录。

Run this file from Maya's Python Script Editor with:
exec(open(r"/absolute/path/to/install.py", encoding="utf-8").read(), {"__file__": r"/absolute/path/to/install.py"})
"""

from __future__ import annotations

import os
import shutil
import sys

from maya import cmds


SOURCE_ROOT = os.path.dirname(os.path.abspath(__file__))
SOURCE_PACKAGE = os.path.join(SOURCE_ROOT, "emeng_maya_bridge")
SCRIPTS_ROOT = cmds.internalVar(userScriptDir=True)
TARGET_PACKAGE = os.path.join(SCRIPTS_ROOT, "emeng_maya_bridge")
USER_SETUP = os.path.join(SCRIPTS_ROOT, "userSetup.py")
STARTUP_LINE = "import maya.utils; maya.utils.executeDeferred(lambda: __import__('emeng_maya_bridge').install_menu())\n"


def install():
    if not os.path.isdir(SOURCE_PACKAGE):
        raise RuntimeError("emeng_maya_bridge package is missing next to install.py")
    if os.path.isdir(TARGET_PACKAGE):
        shutil.rmtree(TARGET_PACKAGE)
    shutil.copytree(SOURCE_PACKAGE, TARGET_PACKAGE)
    existing = ""
    if os.path.isfile(USER_SETUP):
        with open(USER_SETUP, "r", encoding="utf-8") as stream:
            existing = stream.read()
    if STARTUP_LINE.strip() not in existing:
        with open(USER_SETUP, "a", encoding="utf-8") as stream:
            if existing and not existing.endswith("\n"):
                stream.write("\n")
            stream.write(STARTUP_LINE)
    if SCRIPTS_ROOT not in sys.path:
        sys.path.insert(0, SCRIPTS_ROOT)
    import emeng_maya_bridge
    emeng_maya_bridge.install_menu()
    emeng_maya_bridge.show()
    cmds.inViewMessage(amg="萌梦 3D Bridge 安装完成", pos="topCenter", fade=True)


install()
