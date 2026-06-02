import { app, BrowserWindow, Menu, type MenuItemConstructorOptions } from "electron";

export type RegistryMenuOptions = {
  appName: string;
  getMainWindow: () => BrowserWindow | undefined;
  getRegistryBaseUrl: () => string | undefined;
};

export function buildApplicationMenu({ appName, getMainWindow, getRegistryBaseUrl }: RegistryMenuOptions) {
  const template: MenuItemConstructorOptions[] = [
    {
      label: appName,
      submenu: [
        { role: "about" },
        { type: "separator" },
        {
          label: "Settings...",
          accelerator: "CommandOrControl+,",
          click: () => {
            const mainWindow = getMainWindow();
            const registryBaseUrl = getRegistryBaseUrl();
            if (!registryBaseUrl) {
              mainWindow?.show();
              mainWindow?.focus();
              return;
            }

            void mainWindow?.loadURL(`${registryBaseUrl}/settings`);
            mainWindow?.show();
            mainWindow?.focus();
          },
        },
        {
          label: "Close Window",
          accelerator: "CommandOrControl+W",
          click: () => {
            BrowserWindow.getFocusedWindow()?.close();
          },
        },
        {
          label: "Quit",
          accelerator: "CommandOrControl+Q",
          click: () => app.quit(),
        },
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" },
      ],
    },
    {
      label: "Window",
      submenu: [{ role: "minimize" }, { role: "zoom" }],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}
