export const GetUsers = async () => {
  try {
    const result = await window.electron.ipcRenderer.invoke('user:getAll')
    console.log('Resultado de obtener usuarios:', result)
    return result
  } catch (error: any) {
    console.error('Error al obtener usuarios:', error)
    return { error: error.message }
  }
}
