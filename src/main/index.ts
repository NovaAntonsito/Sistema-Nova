import 'reflect-metadata'
import { app, shell, BrowserWindow, ipcMain, Menu, MenuItemConstructorOptions } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { initializeDatabase, closeDatabase } from './database/config/database'
import { ControllerManager } from './database/controllers'

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false,
    autoHideMenuBar: false, // Mostrar la barra de menú
    resizable: true,
    maximizable: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
    // Maximize the window to use full screen
    mainWindow.maximize()
  })

  // Handle window state changes
  mainWindow.on('maximize', () => {
    console.log('Window maximized')
  })

  mainWindow.on('unmaximize', () => {
    console.log('Window unmaximized')
  })

  mainWindow.on('enter-full-screen', () => {
    console.log('Entered full screen')
  })

  mainWindow.on('leave-full-screen', () => {
    console.log('Left full screen')
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Crear menú de aplicación
  const template: MenuItemConstructorOptions[] = [
    {
      label: 'Archivo',
      submenu: [
        {
          label: 'Nuevo Usuario',
          accelerator: 'Ctrl+N',
          click: () => {
            // TODO: Implementar crear nuevo usuario
            console.log('Crear nuevo usuario')
          }
        },
        {
          type: 'separator'
        } as MenuItemConstructorOptions,
        {
          label: 'Configuración',
          accelerator: 'Ctrl+,',
          click: () => {
            console.log('Abrir configuración')
          }
        },
        {
          type: 'separator'
        } as MenuItemConstructorOptions,
        {
          label: 'Salir',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit()
          }
        }
      ]
    },
    {
      label: 'Editar',
      submenu: [
        {
          label: 'Deshacer',
          accelerator: 'Ctrl+Z',
          role: 'undo' as const
        },
        {
          label: 'Rehacer',
          accelerator: 'Ctrl+Y',
          role: 'redo' as const
        },
        {
          type: 'separator'
        } as MenuItemConstructorOptions,
        {
          label: 'Cortar',
          accelerator: 'Ctrl+X',
          role: 'cut' as const
        },
        {
          label: 'Copiar',
          accelerator: 'Ctrl+C',
          role: 'copy' as const
        },
        {
          label: 'Pegar',
          accelerator: 'Ctrl+V',
          role: 'paste' as const
        },
        {
          label: 'Seleccionar Todo',
          accelerator: 'Ctrl+A',
          role: 'selectAll' as const
        }
      ]
    },
    {
      label: 'Ver',
      submenu: [
        {
          label: 'Recargar',
          accelerator: 'Ctrl+R',
          click: () => {
            mainWindow.webContents.reload()
          }
        },
        {
          label: 'Forzar Recarga',
          accelerator: 'Ctrl+Shift+R',
          click: () => {
            mainWindow.webContents.reloadIgnoringCache()
          }
        },
        {
          type: 'separator'
        } as MenuItemConstructorOptions,
        {
          label: 'Zoom In',
          accelerator: 'Ctrl+Plus',
          click: () => {
            const currentZoom = mainWindow.webContents.getZoomLevel()
            mainWindow.webContents.setZoomLevel(currentZoom + 1)
          }
        },
        {
          label: 'Zoom Out',
          accelerator: 'Ctrl+-',
          click: () => {
            const currentZoom = mainWindow.webContents.getZoomLevel()
            mainWindow.webContents.setZoomLevel(currentZoom - 1)
          }
        },
        {
          label: 'Zoom Normal',
          accelerator: 'Ctrl+0',
          click: () => {
            mainWindow.webContents.setZoomLevel(0)
          }
        },
        {
          type: 'separator'
        } as MenuItemConstructorOptions,
        {
          label: 'Pantalla Completa',
          accelerator: 'F11',
          click: () => {
            mainWindow.setFullScreen(!mainWindow.isFullScreen())
          }
        },
        {
          label: 'Maximizar/Restaurar',
          accelerator: 'Ctrl+Shift+M',
          click: () => {
            if (mainWindow.isMaximized()) {
              mainWindow.unmaximize()
            } else {
              mainWindow.maximize()
            }
          }
        },
        {
          type: 'separator'
        } as MenuItemConstructorOptions,
        {
          label: 'Herramientas de Desarrollador',
          accelerator: 'F12',
          click: () => {
            mainWindow.webContents.toggleDevTools()
          }
        }
      ]
    },
    {
      label: 'Ventana',
      submenu: [
        {
          label: 'Minimizar',
          accelerator: 'Ctrl+M',
          click: () => {
            mainWindow.minimize()
          }
        },
        {
          label: 'Cerrar',
          accelerator: 'Ctrl+W',
          click: () => {
            mainWindow.close()
          }
        }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

let controllerManager: ControllerManager | null = null

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  // Initialize database first
  try {
    await initializeDatabase()
    console.log('Database initialized successfully')

    // Add a small delay to ensure database is fully ready
    await new Promise((resolve) => setTimeout(resolve, 100))

    // Initialize controllers after database is ready
    controllerManager = new ControllerManager()
    console.log('Controllers initialized successfully')
  } catch (error) {
    console.error('Failed to initialize database:', error)
    console.error('Error details:', error)
    // Continue app startup even if database fails to allow debugging
  }

  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', async () => {
  // Cleanup controllers before closing database
  if (controllerManager) {
    controllerManager.cleanup()
    console.log('Controllers cleaned up successfully')
  }

  // Close database connection before quitting
  try {
    await closeDatabase()
  } catch (error) {
    console.error('Error closing database:', error)
  }

  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Handle app quit event to ensure database is closed
app.on('before-quit', async () => {
  // Cleanup controllers before closing database
  if (controllerManager) {
    controllerManager.cleanup()
    console.log('Controllers cleaned up successfully')
  }

  try {
    await closeDatabase()
  } catch (error) {
    console.error('Error closing database on quit:', error)
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
