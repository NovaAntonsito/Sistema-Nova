// Pruebas paso a paso para IPC
// Copia y pega cada sección una a la vez en la consola de DevTools

// Paso 1: Probar conexión básica de IPC
console.log('Probando conexión básica de IPC...')
window.electron.ipcRenderer.send('ping')

// Paso 2: Probar creación de intereses (esto debería funcionar primero)
console.log('Probando creación de intereses...')
const testInterest = async () => {
  try {
    const result = await window.electron.ipcRenderer.invoke('interest:createDefaults')
    console.log('Resultado de creación de intereses:', result)
    return result
  } catch (error) {
    console.error('Error en creación de intereses:', error)
    return { error: error.message }
  }
}

// Paso 3: Probar creación de usuario
const testUser = async () => {
  try {
    const userData = {
      nombre: 'Usuario de Prueba',
      email: 'prueba@ejemplo.com',
      phoneNumber: '123456789'
    }
    const result = await window.electron.ipcRenderer.invoke('user:create', userData)
    console.log('Resultado de creación de usuario:', result)
    return result
  } catch (error) {
    console.error('Error en creación de usuario:', error)
    return { error: error.message }
  }
}

// Paso 4: Probar obtener todos los usuarios
const testGetUsers = async () => {
  try {
    const result = await window.electron.ipcRenderer.invoke('user:getAll')
    console.log('Resultado de obtener usuarios:', result)
    return result
  } catch (error) {
    console.error('Error al obtener usuarios:', error)
    return { error: error.message }
  }
}

// Paso 5: Probar obtener todos los intereses
const testGetInterests = async () => {
  try {
    const result = await window.electron.ipcRenderer.invoke('interest:getAll')
    console.log('Resultado de obtener intereses:', result)
    return result
  } catch (error) {
    console.error('Error al obtener intereses:', error)
    return { error: error.message }
  }
}

// Paso 6: Probar creación de presupuesto (necesita ID de usuario válido)
const testCreateBudget = async (userId) => {
  try {
    const budgetData = {
      _expirationDate: new Date('2025-12-31'),
      baseAmount: 1000,
      paymentTerm: 12,
      userId: userId
    }
    const result = await window.electron.ipcRenderer.invoke('budget:create', budgetData)
    console.log('Resultado de creación de presupuesto:', result)
    return result
  } catch (error) {
    console.error('Error en creación de presupuesto:', error)
    return { error: error.message }
  }
}

// Paso 7: Probar búsqueda de usuario por email
const testSearchUserByEmail = async (email = 'prueba@ejemplo.com') => {
  try {
    const result = await window.electron.ipcRenderer.invoke('user:searchByEmail', email)
    console.log('Resultado de búsqueda por email:', result)
    return result
  } catch (error) {
    console.error('Error en búsqueda por email:', error)
    return { error: error.message }
  }
}

// Paso 8: Probar búsqueda de presupuesto por código
const testSearchBudgetByCode = async (code = 'BUD-001') => {
  try {
    const result = await window.electron.ipcRenderer.invoke('budget:searchByCode', code)
    console.log('Resultado de búsqueda por código:', result)
    return result
  } catch (error) {
    console.error('Error en búsqueda por código:', error)
    return { error: error.message }
  }
}

// Prueba completa secuencial
const runFullTest = async () => {
  console.log('=== Iniciando Prueba Completa de IPC ===')

  try {
    // 1. Crear configuraciones de interés por defecto
    console.log('1. Creando configuraciones de interés por defecto...')
    await testInterest()

    // 2. Crear un usuario
    console.log('2. Creando un usuario...')
    const userResult = await testUser()
    const userId = userResult.success ? userResult.data.id : null

    if (!userId) {
      console.error('Falló la creación del usuario, deteniendo prueba')
      return
    }

    // 3. Obtener todos los usuarios
    console.log('3. Obteniendo todos los usuarios...')
    await testGetUsers()

    // 4. Probar búsqueda de usuario
    console.log('4. Probando búsqueda de usuario...')
    await testSearchUserByEmail()

    // 5. Obtener todos los intereses
    console.log('5. Obteniendo todos los intereses...')
    await testGetInterests()

    // 6. Crear un presupuesto
    console.log('6. Creando un presupuesto...')
    const budgetResult = await testCreateBudget(userId)

    // 7. Obtener todos los presupuestos
    console.log('7. Obteniendo todos los presupuestos...')
    const budgetsResult = await window.electron.ipcRenderer.invoke('budget:getAll')
    console.log('Resultado de todos los presupuestos:', budgetsResult)

    // 8. Probar búsqueda de presupuesto
    if (budgetResult.success && budgetResult.data.code) {
      console.log('8. Probando búsqueda de presupuesto...')
      await testSearchBudgetByCode(budgetResult.data.code)
    }

    console.log('=== Prueba Completa Terminada ===')
  } catch (error) {
    console.error('La prueba falló:', error)
  }
}

// Instrucciones:
console.log('=== Instrucciones de Prueba IPC ===')
console.log('1. Ejecutar: testInterest()')
console.log('2. Ejecutar: testUser()')
console.log('3. Ejecutar: testGetUsers()')
console.log('4. Ejecutar: testGetInterests()')
console.log('5. Ejecutar: testCreateBudget(userId) - usar ID del paso 2')
console.log('6. Ejecutar: testSearchUserByEmail()')
console.log('7. Ejecutar: testSearchBudgetByCode()')
console.log('')
console.log('Para ejecutar todas las pruebas: runFullTest()')
console.log('')
console.log('Si algún paso falla, revisar la consola del proceso principal para errores')
