"""萌梦 3D Bridge for Autodesk Maya 2022+."""

from __future__ import annotations

from maya import cmds, mel


VERSION = (1, 0, 0)
MENU_NAME = "Emeng3DBridgeMenu"


def install_menu():
    """安装一个顶层萌梦菜单。"""

    if cmds.menu(MENU_NAME, exists=True):
        cmds.deleteUI(MENU_NAME)
    main_window = mel.eval("$tmp = $gMainWindow")
    menu = cmds.menu(MENU_NAME, label="萌梦", parent=main_window, tearOff=True)
    cmds.menuItem(label="3D Bridge", parent=menu, command=lambda *_args: show())
    return menu


def show():
    from . import ui
    ui.show()


def shutdown():
    from . import bridge
    bridge.shutdown_all()
