const getAllUsers = async () => {
  return await window.electron.ipcRenderer.invoke('user:getAll')
}

export { getAllUsers }
